// WIN CUTSCENES: when Soul Summoner, Mr Wake, Lacy or one of the test fighters (NU, AERO, WHAT ONCE WAS,
// ROSEMARY) wins a match, a short cinematic about their backstory
// plays before the results (MatchScene.toResults sends the winner here; everyone else goes straight to Results).
// About 6-7 seconds: a few shots - wide, a close-up, a final pose - letterboxed, with hard cuts, white flashes
// and a title card that slams in with the winner's name and a line. The fighters who lost are in it too, as
// black silhouettes. Any button skips it (after half a second).
//
// Each cutscene is a list of shots in CUTS below: [from frame, name]; the scene calls shot_<id>_<name>(t, k)
// every frame of that shot (t = frames since the cutscene started, k = 0..1 through the shot).
// TEST FIGHTERS > WIN SCREEN plays one on its own (data.preview: it goes back to the lab after).
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { MenuInput } from './menuInput.js';
import { ROSTER, TEST_ROSTER, showFighter } from '../fighters/roster.js';
import { skinTexture, skinInfo } from '../fighters/skins.js';
import { AERO_FULL } from '../fighters/aero.js';
import { SEEN } from '../fighters/lastSeen.js';
import { sfx } from '../audio/sfx.js';
import { stopMusic } from '../audio/music.js';

const W = VIEW_W, H = VIEW_H;
// how long each cutscene runs (frames), when its title card comes in, and its words
const CUTS = {
  'soul-summoner': { len: 400, card: 236, name: 'SOUL SUMMONER', line: 'REST NOW. YOU FOUGHT WELL.', sub: 'THE BLUE-FLAME KNIGHT',
    color: '#8ad8ff', stroke: '#06142a', shots: [[0, 'graves'], [124, 'close'], [204, 'crown']] },
  'mr-wake': { len: 420, card: 262, name: 'MR WAKE', line: 'THANK YOU FOR THE DANCE.', sub: 'THE GENTLEMAN OF THE DEEP',
    color: '#d8a8ff', stroke: '#14061e', shots: [[0, 'bridge'], [112, 'drag'], [196, 'mask'], [248, 'bow']] },
  'hero-knight': { len: 400, card: 236, name: 'LACY', line: 'NO ONE ELSE FALLS TONIGHT.', sub: 'THE LAST OF THE ORDER',
    color: '#ffd08a', stroke: '#1e0a04', shots: [[0, 'field'], [112, 'close'], [188, 'salute']] },
  // ---- the test fighters
  'nu': { len: 440, card: 236, name: 'NU', line: 'THANK YOU, GOODNIGHT!', sub: 'THE FRONTMAN',
    color: '#9be32a', stroke: '#0a1404', shots: [[0, 'stage'], [120, 'close'], [196, 'encore']] },
  'aero': { len: 400, card: 240, name: 'AERO', line: 'STAY HYDRATED.', sub: 'THE LAST SCREENSAVER',
    color: '#9ff0ff', stroke: '#04203a', shots: [[0, 'sky'], [116, 'close'], [190, 'ascend']] },
  'what-once-was': { len: 410, card: 250, name: 'WHAT ONCE WAS', line: 'PLEASE STAND BY.', sub: 'LOST IN LEVEL 0',
    color: '#fff6b0', stroke: '#1a1404', shots: [[0, 'hall'], [118, 'screen'], [196, 'lightsout']] },
  'last-seen': { len: 470, card: 352, name: 'ROSEMARY', line: 'HAVE YOU SEEN ME?', sub: 'STILL MISSING',
    color: '#e8c86a', stroke: '#1a0404', shots: [[0, 'street'], [100, 'flicker'], [186, 'cry'], [262, 'mirror']] },
};
// where each fighter's head is in its idle frame (for the close-ups), and its feet (the sprite origin)
// (by idle sheet, so a fighter's other forms - FULL AERO, SEEN - have their own)
const HEAD = { ss_idle: [34, 11, 32, 59], wake_idle: [32, 10, 36, 62], hk_idle: [67, 47, 66, 86], nu_idle: [35, 14, 32, 59], aero_idle: [33, 12, 32, 59],
  aero_king_idle: [32, 12, 32, 59], ls_idle: [34, 11, 32, 59], ls_wrong_idle: [47, 17, 32, 59], wow_idle: [36, 9, 32, 59] };
const ALL = () => [...ROSTER, ...TEST_ROSTER];

export function hasWinCutscene(id) { return !!CUTS[id]; }

export class WinScene extends Phaser.Scene {
  constructor() { super('Win'); }
  create(data) {
    this.data0 = data; this.t = 0; this.menu = new MenuInput(this);
    const win = data.results[0];
    this.win = win; this.cut = CUTS[win.fighter];
    this.def = (ALL().find((r) => r.id === win.fighter) || ROSTER[0]).def;
    stopMusic();
    this.bg = this.add.graphics();                                         // the set
    this.losers = data.results.slice(1).map((r) => {                       // the fighters who lost, as silhouettes
      const d = (ALL().find((x) => x.id === r.fighter) || {}).def;   // (test fighters can lose too)
      const s = this.add.sprite(0, 0, (d || this.def).sheets.idle, 0).setVisible(false);
      if (d) showFighter(s, d, 0, r.skin || 0);
      s.setTint(0x000000).setTintMode(Phaser.TintModes.FILL);
      return { s, def: d };
    });
    this.mid = this.add.graphics();                                        // between them and the winner
    this.hero = this.add.sprite(W / 2, 300, this.def.sheets.idle, 0);
    this.hero2 = this.add.sprite(0, 0, this.def.sheets.idle, 0).setVisible(false);   // a second figure (ROSEMARY: her reflection)
    this.fx = this.add.graphics();                                         // in front: wisps, embers, rain, eyes
    this.faceImg = this.add.image(W / 2, 160, 'wow_faces', 0).setVisible(false);   // (WHAT ONCE WAS: Mason's faces, up on its screen)
    this.front = this.add.graphics();                                      // in front of that
    this.over = this.add.graphics();                                       // flashes, vignette, letterbox
    this.title = this.add.text(W / 2, 74, '', { fontFamily: FONT, fontSize: '30px', color: this.cut.color, stroke: this.cut.stroke, strokeThickness: 8 }).setOrigin(0.5).setVisible(false);
    this.subT = this.add.text(W / 2, 50, this.cut.sub, { fontFamily: FONT, fontSize: '8px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5).setVisible(false);
    this.lineT = this.add.text(W / 2, H - 52, '', { fontFamily: FONT, fontSize: '10px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5).setVisible(false);
    this.skipT = this.add.text(W - 10, H - 12, 'PRESS TO SKIP', { fontFamily: FONT, fontSize: '6px', color: '#8a87a3' }).setOrigin(1, 1).setAlpha(0.7);
    this.flash = 0; this.clicked = false;
    this.input.on('pointerdown', () => { this.clicked = true; });
    // a fixed scatter for things that shouldn't jump about between frames (graves, eyes, villagers...)
    let s = 7; this.rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    this.spots = Array.from({ length: 40 }, () => [this.rnd(), this.rnd(), this.rnd()]);
  }

  // ---------------------------------------------------------------- shared helpers
  // the winner, idle (frame by time) or a frame of one of its moves
  // (def: another form of the winner - FULL AERO, SEEN - in the same costume)
  idle(x, y, sc, t, flip = false, def = this.def) {
    showFighter(this.hero, def, Math.floor(t / 6), this.win.skin || 0);
    this.hero.setPosition(x, y).setScale(sc).setFlipX(!!def.facesLeft !== flip).setRotation(0).setAlpha(1).clearTint().setVisible(true);
  }
  move(name, i, x, y, sc, def = this.def) {
    const A = def.moveAnims[name], set = skinInfo(def.id, this.win.skin || 0).sheetSet;
    const key = set && def.costumeSheets && def.costumeSheets[set] ? def.costumeSheets[set].moves : skinTexture(this, def.sheets.moves, def.id, this.win.skin || 0);
    this.hero.setTexture(key, A[0] + Math.max(0, Math.min(A[1] - 1, Math.floor(i)))).setOrigin(def.movesOrigin[0], def.movesOrigin[1])
      .setPosition(x, y).setScale(sc).setFlipX(!!def.facesLeft).setRotation(0).setAlpha(1).clearTint().setVisible(true);
  }
  // a close-up: the winner's head at (cx, cy), at scale sc
  closeUp(cx, cy, sc, t, def = this.def) {
    const [hx, hy, ox, oy] = HEAD[def.sheets.idle] || [32, 12, 32, 59];
    this.idle(cx + (ox - hx) * sc, cy + (oy - hy) * sc, sc, t, false, def);
  }
  // the losers, posed by the shot: list of [x, y, scale, rotation, alpha]
  // (p[5]: kneel - squashed down and bent forward a little)
  posLosers(spots, tint = 0x000000) {
    this.losers.forEach((l, i) => {
      const p = spots[i];
      if (!p || !l.def) { l.s.setVisible(false); return; }
      const kneel = p[5] ? 0.72 : 1;
      l.s.setPosition(p[0], p[1]).setScale(p[2], p[2] * kneel).setRotation(p[3] || 0).setAlpha(p[4] ?? 1).setTint(tint).setVisible(true);
    });
  }
  hideLosers() { for (const l of this.losers) l.s.setVisible(false); }
  sky(g, top, bottom, steps = 10) {                                         // banded sky, top colour to bottom colour
    const c1 = Phaser.Display.Color.IntegerToColor(top), c2 = Phaser.Display.Color.IntegerToColor(bottom);
    for (let i = 0; i < steps; i++) {
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(c1, c2, steps - 1, i);
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1); g.fillRect(0, Math.floor(i * H / steps), W, Math.ceil(H / steps) + 1);
    }
  }
  rain(g, t, col, a) {
    for (let i = 0; i < 70; i++) {
      const sp = this.spots[i % 40], x = (sp[0] * W * 1.3 + i * 37 - t * 3) % (W + 60), y = (sp[1] * H + t * 11 + i * 23) % (H + 40) - 20;
      g.lineStyle(1, col, a); g.lineBetween(x, y, x - 3, y + 12);
    }
  }
  vignette(g, strength = 0.55) {
    for (let i = 0; i < 6; i++) { const m = i * 10; g.fillStyle(0x000000, strength * 0.16); g.fillRect(0, 0, W, m + 8); g.fillRect(0, H - m - 8, W, m + 8); g.fillRect(0, 0, m + 12, H); g.fillRect(W - m - 12, 0, m + 12, H); }
  }
  glow(g, x, y, r, col, a) { for (let i = 1; i <= 6; i++) { g.fillStyle(col, a / 6); g.fillCircle(x, y, r * (1.15 - i * 0.15)); } }   // a soft light: rings, brighter in the middle
  cutTo() { this.flash = 6; sfx('whoosh', 0.5, 0.7); this.cameras.main.shake(80, 0.004); }

  update() {
    const t = ++this.t, C = this.cut;
    // skip
    const m = this.menu.poll();
    if (t > 30 && (m.ok || m.back || this.clicked || m.pads.some((p) => p.button === 'a' || p.button === 'start' || p.button === 'b'))) return this.done();
    this.clicked = false;
    if (t >= C.len) return this.done();
    this.bg.clear(); this.mid.clear(); this.fx.clear(); this.front.clear(); this.over.clear(); this.faceImg.setVisible(false); this.hero2.setVisible(false);
    // which shot
    let si = 0; while (si + 1 < C.shots.length && t >= C.shots[si + 1][0]) si++;
    const [from, name] = C.shots[si], to = si + 1 < C.shots.length ? C.shots[si + 1][0] : C.len;
    if (t === from && si > 0) this.cutTo();
    this['shot_' + this.def.id.replace(/-/g, '_') + '_' + name](t, (t - from) / (to - from), t - from);
    // the title card
    if (t >= C.card) {
      const k = t - C.card, slam = Math.max(1, 3 - k * 0.4);
      if (k === 0) { sfx('bighit', 0.9, 0.6); this.cameras.main.shake(160, 0.01); this.flash = 4; }
      this.title.setText(C.name).setScale(slam).setAlpha(Math.min(1, k / 3)).setVisible(true);
      this.subT.setVisible(k > 10);
      const n = Math.max(0, Math.floor((k - 18) / 2));                       // the line, typed out
      if (k >= 18) { this.lineT.setText(C.line.slice(0, n)).setVisible(true); if (n <= C.line.length && (k - 18) % 4 === 0 && C.line[n - 1] !== ' ') sfx('menu', 0.25, 1.4); }
      this.over.fillStyle(0x000000, 0.35); this.over.fillRect(0, 40, W, 58);
    }
    // the letterbox (slides in), the flash
    const bar = Math.min(34, t * 3);
    this.over.fillStyle(0x000000, 1); this.over.fillRect(0, 0, W, bar); this.over.fillRect(0, H - bar, W, bar);
    if (this.flash > 0) { this.over.fillStyle(0xffffff, this.flash / 6); this.over.fillRect(0, 0, W, H); this.flash--; }
    if (t < 10) { this.over.fillStyle(0x000000, 1 - t / 10); this.over.fillRect(0, 0, W, H); }
    if (t > C.len - 14) { this.over.fillStyle(0x000000, (t - (C.len - 14)) / 14); this.over.fillRect(0, 0, W, H); }
    this.skipT.setVisible(t > 30);
  }
  done() {
    if (this.leaving) return; this.leaving = true;
    if (this.data0.preview) return this.scene.start('TestFighters');     // (TEST FIGHTERS > WIN SCREEN)
    this.scene.start('Results', this.data0);
  }

  // ================================================================ SOUL SUMMONER
  // He died holding the Sky Sanctum's gates and came back. The cold blue fire in his palm is the souls of
  // everyone who fell beside him. Rain over the graves at the ruined gates; a soul rises from every grave and
  // comes to his hand; the fallen kneel; close on his crown as the fire flares; and the beaten fighters'
  // silhouettes turn into souls of their own and join the ring around him.
  sanctum(g, t, ground) {
    this.sky(g, 0x02040e, 0x10203a);
    g.fillStyle(0xc8d8f0, 0.9); g.fillCircle(520, 74, 16); g.fillStyle(0x10203a, 0.8); g.fillCircle(526, 70, 14);   // a sliver of moon
    g.fillStyle(0x0a1222, 1);                                               // the ruined gates of the Sanctum
    g.fillRect(150, 70, 44, ground - 70); g.fillRect(446, 90, 44, ground - 90);
    g.fillRect(140, 60, 64, 14); g.fillRect(436, 80, 64, 14);
    g.fillTriangle(204, 74, 300, 46, 204, 96); g.fillTriangle(436, 94, 360, 70, 436, 116);   // the broken arch, two halves
    g.fillStyle(0x16223a, 1); g.fillRect(160, 80, 8, ground - 80); g.fillRect(456, 100, 8, ground - 100);
    g.fillStyle(0x1e3a6a, 0.35); g.fillCircle(172, 52, 8); g.fillCircle(468, 72, 8);           // dead braziers on top
    g.fillStyle(0x070b16, 1); g.fillRect(0, ground, W, H - ground);       // the ground
    g.fillStyle(0x0e1626, 1); g.fillRect(0, ground, W, 3);
  }
  graves() {                                                                // grave markers: [x, y, kind]
    return [[64, 296, 0], [118, 288, 1], [210, 292, 0], [262, 300, 1], [392, 300, 0], [440, 290, 1], [530, 294, 0], [590, 302, 1], [32, 312, 1], [600, 316, 0]];
  }
  grave(g, x, y, kind, s = 1) {
    g.fillStyle(0x1a2234, 1);
    if (kind) { g.fillRect(x - 2 * s, y - 22 * s, 4 * s, 22 * s); g.fillRect(x - 8 * s, y - 16 * s, 16 * s, 4 * s); }   // a cross
    else { g.fillRect(x - 8 * s, y - 18 * s, 16 * s, 18 * s); g.fillCircle(x, y - 18 * s, 8 * s); }                    // a headstone
    g.fillStyle(0x2a3650, 1); g.fillRect(x - 8 * s, y - 2 * s, 16 * s, 2 * s);
  }
  wisp(g, x, y, r, a = 1) {                                                 // a soul: a blue flame
    g.fillStyle(0x3aa0ff, 0.25 * a); g.fillCircle(x, y, r * 2.2);
    g.fillStyle(0x6ac8ff, 0.8 * a); g.fillCircle(x, y, r); g.fillTriangle(x - r, y, x + r, y, x, y - r * 2.6);
    g.fillStyle(0xe8f8ff, a); g.fillCircle(x, y + r * 0.2, r * 0.45);
  }
  ssKneel(a) { return [[150, 302, 1.7, 0.12, a, 1], [494, 302, 1.7, -0.12, a, 1], [86, 306, 1.7, 0.12, a, 1]]; }
  shot_soul_summoner_graves(t, k, s) {
    const g = this.bg, ground = 300, hx = W / 2, palm = [hx + 48, ground - 69];
    this.sanctum(g, t, ground);
    for (const [x, y, kd] of this.graves()) if (y < 300) this.grave(g, x, y, kd);
    this.idle(hx, ground, 3, t);
    this.posLosers(this.ssKneel(0.92), 0x05070e);
    for (const l of this.losers) if (l.def) l.s.setFlipX(l.s.x > W / 2 ? !l.def.facesLeft : !!l.def.facesLeft);
    for (const [x, y, kd] of this.graves()) if (y >= 300) this.grave(this.fx, x, y, kd, 1.3);
    // a soul rises from each grave and comes to his hand
    this.graves().forEach(([x, y], i) => {
      const st = 16 + i * 9, p = Math.max(0, Math.min(1, (s - st) / 60));
      if (s < st) return;
      if (s === st) sfx('summon', 0.25, 1.4 + i * 0.05);
      const e = p * p * (3 - 2 * p), wx = x + (palm[0] - x) * e + Math.sin(s * 0.2 + i) * 6 * (1 - e), wy = (y - 20) + (palm[1] - (y - 20)) * e - Math.sin(e * Math.PI) * 50;
      this.wisp(this.fx, wx, wy, 4 + 2 * (1 - e), 1 - Math.max(0, p - 0.95) * 20);
    });
    this.wisp(this.fx, palm[0], palm[1], 5 + Math.min(4, s / 25) + Math.sin(s * 0.3), 1);     // the fire in his palm, growing
    this.rain(this.fx, t, 0x8aa8d8, 0.35);
    this.vignette(this.over);
    if (s === 1) sfx('flame', 0.4, 0.8);
  }
  shot_soul_summoner_close(t, k, s) {
    const g = this.bg;
    this.sky(g, 0x01020a, 0x0a1830);
    this.hideLosers();
    const flare = Math.min(1, s / 30);
    g.fillStyle(0x3aa0ff, 0.12 + 0.18 * flare); g.fillCircle(W / 2 + 60, 170, 120 * flare + 30);     // the soulfire flaring off to the side
    g.fillStyle(0x6ac8ff, 0.1 + 0.2 * flare); g.fillCircle(W / 2 + 60, 170, 60 * flare + 10);
    this.closeUp(W / 2 - 10, 156, 6.4 + k * 0.8, t);                      // slowly pushing in on the crown
    this.hero.setTint(0xb8d8ff).setTintMode(Phaser.TintModes.MULTIPLY);
    if (s === 12) { sfx('flame', 0.7, 0.7); this.cameras.main.shake(200, 0.006); }
    for (let i = 0; i < 18; i++) {                                         // sparks of soulfire drifting up across the shot
      const sp = this.spots[i], x = sp[0] * W, y = H - ((sp[1] * H + s * (1.5 + sp[2] * 2)) % H);
      this.fx.fillStyle(i % 3 ? 0x6ac8ff : 0xe8f8ff, 0.8); this.fx.fillRect(x, y, 2, 2);
    }
    this.rain(this.fx, t, 0x8aa8d8, 0.25);
    this.vignette(this.over, 0.8);
  }
  shot_soul_summoner_crown(t, k, s) {
    const g = this.bg, ground = 304, hx = W / 2;
    this.sanctum(g, t, ground);
    for (const [x, y, kd] of this.graves()) if (y < 300) this.grave(g, x, y, kd);
    this.move('taunt', Math.min(40, 10 + s * 0.5), hx, ground, 3);      // the flame raised high
    // the beaten turn to soulfire and join him: their silhouettes fade as souls lift out of them
    const fade = Math.max(0, 1 - s / 40);
    this.posLosers(this.ssKneel(fade * 0.92), 0x05070e);
    for (const l of this.losers) if (l.def) l.s.setFlipX(l.s.x > W / 2 ? !l.def.facesLeft : !!l.def.facesLeft);
    const n = 10 + this.losers.length * 2;
    for (let i = 0; i < n; i++) {                                         // the ring of souls around him
      const a = s * 0.03 + i * Math.PI * 2 / n, r = 110 + Math.sin(s * 0.05 + i) * 8;
      this.wisp(this.fx, hx + Math.cos(a) * r, ground - 90 + Math.sin(a) * r * 0.35, 4, Math.min(1, s / 20));
    }
    this.mid.fillStyle(0x3aa0ff, 0.15); this.mid.fillCircle(hx + 10, ground - 190, 40 + Math.sin(s * 0.2) * 4);
    if (s === 1) sfx('summon', 0.6, 0.9);
    this.rain(this.fx, t, 0x8aa8d8, 0.3);
    this.vignette(this.over);
  }

  // ================================================================ MR WAKE
  // Something that rose from the black water under Gravemoon Bridge the night a purple star fell in. Unfailingly
  // polite. On the bridge under the moon, the losers stand with him - until the water below opens its eyes and the
  // dark reaches up and takes them down. A close look at the cracked white mask. Then he bows.
  bridge(g, t, deck) {
    this.sky(g, 0x06020e, 0x241038);
    for (let i = 0; i < 30; i++) { const sp = this.spots[i]; g.fillStyle(0xffffff, 0.3 + 0.5 * ((t + i * 13) % 90 < 70 ? sp[2] : 0)); g.fillRect(sp[0] * W, 36 + sp[1] * 130, 1, 1); }
    g.fillStyle(0xe8d8ff, 0.18); g.fillCircle(470, 104, 46); g.fillStyle(0xf4ecff, 1); g.fillCircle(470, 104, 32);   // the moon
    g.fillStyle(0xd8c8f0, 1); g.fillCircle(458, 96, 6); g.fillCircle(482, 116, 4);
    g.fillStyle(0xc89aff, 0.9); g.fillTriangle(560, 40, 563, 48, 556, 46);                                            // a purple star, falling
    g.fillStyle(0x020106, 1); g.fillRect(0, deck + 22, W, H - deck - 22);   // the black water
    for (let i = 0; i < 9; i++) { g.fillStyle(0xd8c8ff, 0.22 - i * 0.02); g.fillRect(470 - 30 + Math.sin(t * 0.05 + i) * 6 - i * 2, deck + 34 + i * 8, 60 + i * 4, 2); }   // the moon in it
    // the bridge: a stone deck with a parapet, three arches below
    g.fillStyle(0x14101e, 1); g.fillRect(0, deck, W, 22); g.fillRect(0, deck - 14, W, 6);
    for (let x = 0; x < W; x += 32) g.fillRect(x, deck - 14, 8, 14);
    g.fillStyle(0x1e1a2c, 1); g.fillRect(0, deck, W, 3);
    g.fillStyle(0x0a0812, 1); for (const ax of [100, 320, 540]) { g.fillRect(ax - 70, deck + 22, 18, 60); g.fillRect(ax + 52, deck + 22, 18, 60); }
    g.fillStyle(0x281e3c, 1); g.fillRect(300, deck - 70, 6, 56); g.fillStyle(0xc89aff, 0.25 + 0.1 * Math.sin(t * 0.1)); g.fillCircle(303, deck - 74, 10);   // a lamp
    g.fillStyle(0xe8d0ff, 1); g.fillCircle(303, deck - 74, 3);
  }
  eyes(g, t, deck, open) {                                                  // the eyes in the water
    for (let i = 0; i < 16; i++) {
      const sp = this.spots[i + 10], at = i * 4, o = Math.max(0, Math.min(1, (open - at) / 10)) * (0.8 + 0.2 * Math.sin(t * 0.07 + i));
      if (o <= 0) continue;
      const x = 20 + sp[0] * (W - 40), y = deck + 50 + sp[1] * (H - deck - 80), s = 1.5 + sp[2] * 2.5;
      g.fillStyle(0xc89aff, 0.25 * o); g.fillEllipse(x, y, 14 * s, 6 * s * o);
      g.fillStyle(0xf4ecff, o); g.fillEllipse(x, y, 7 * s, 3 * s * o); g.fillEllipse(x + 9 * s, y, 7 * s, 3 * s * o);
      g.fillStyle(0x14061e, o); g.fillRect(x - 0.5 * s, y - s * o, s, 2 * s * o); g.fillRect(x + 9 * s - 0.5 * s, y - s * o, s, 2 * s * o);
    }
  }
  shot_mr_wake_bridge(t, k, s) {
    const deck = 244;
    this.bridge(this.bg, t, deck);
    this.idle(W / 2, deck, 3, t);
    this.posLosers([[170, deck, 2.6, 0, 0.95], [470, deck, 2.6, 0, 0.95], [90, deck, 2.6, 0, 0.95]]);
    for (const l of this.losers) if (l.def) l.s.setFlipX(l.s.x > W / 2);
    this.eyes(this.fx, t, deck, s - 40);
    if (s === 40) sfx('rumble', 0.5, 0.5);
    if (s % 30 === 10) sfx('curse', 0.15, 0.6);
    this.vignette(this.over);
  }
  shot_mr_wake_drag(t, k, s) {
    const deck = 244;
    this.bridge(this.bg, t, deck);
    this.move('taunt', s * 0.45, W / 2, deck, 3);                          // he twirls his staff, quite unbothered
    this.eyes(this.mid, t, deck, 99);
    // the dark reaches up over the parapet and takes them down
    const spots = [[170, deck], [470, deck], [90, deck]];
    this.posLosers(spots.map(([x, y], i) => {
      const st = 10 + i * 14, p = Math.max(0, Math.min(1, (s - st) / 26));
      if (s === st + 26) { sfx('smoke', 0.6, 0.5); this.cameras.main.shake(100, 0.006); }
      return [x, y + p * p * 120, 2.6, p * (x < W / 2 ? -0.6 : 0.6), 0.95 * (1 - Math.max(0, p - 0.7) / 0.3)];
    }));
    spots.slice(0, this.losers.length).forEach(([x], i) => {
      const st = i * 14, p = Math.max(0, Math.min(1, (s - st) / 18)), lift = Math.min(1, p * 1.4);
      if (p <= 0) return;
      for (let j = 0; j < 3; j++) {                                        // tendrils of shadow
        const tx = x - 14 + j * 14 + Math.sin(s * 0.2 + j) * 4, top = deck + 30 - lift * 80 + Math.max(0, (s - st - 26)) * 5;
        this.fx.lineStyle(7 - j, 0x07020c, 1); this.fx.lineBetween(tx, H, tx + Math.sin(s * 0.1 + j) * 10, top);
        this.fx.fillStyle(0x07020c, 1); this.fx.fillCircle(tx + Math.sin(s * 0.1 + j) * 10, top, 5);
      }
      if (s > st + 26 && s < st + 46) { const r = (s - st - 26) * 3; this.fx.lineStyle(2, 0xc89aff, 1 - (s - st - 26) / 20); this.fx.strokeEllipse(x, deck + 60, r * 2, r * 0.5); }   // the splash ring
    });
    this.vignette(this.over);
  }
  shot_mr_wake_mask(t, k, s) {
    this.sky(this.bg, 0x020106, 0x14081e);
    this.hideLosers();
    this.eyes(this.bg, t, 40, 99);                                          // the eyes, all around, watching
    this.closeUp(W / 2, 150, 7 + k * 0.6, t);
    this.hero.setTint(0xe0d0ff).setTintMode(Phaser.TintModes.MULTIPLY);
    if (s === 6) sfx('staff', 0.5, 0.7);
    this.vignette(this.over, 0.9);
  }
  shot_mr_wake_bow(t, k, s) {
    const deck = 244;
    this.bridge(this.bg, t, deck);
    this.hideLosers();
    this.move('taunt', Math.min(30, 22 + s * 0.25), W / 2, deck, 3);      // the bow, held
    this.eyes(this.fx, t, deck, 70 - s * 0.6);                              // the eyes closing again, one by one
    if (s === 20) sfx('petal', 0.5, 1.1);
    this.vignette(this.over);
  }

  // ================================================================ LACY
  // The youngest knight of an order that no longer exists. The night her castle burned, her hair turned white and
  // she walked out with the order's last sword and its oath: protect those who cannot protect themselves. A field
  // at night, the castle burning on the hill; the people she kept safe huddled behind her; the beaten kneel,
  // spared. A close look as the embers blow past. Then the salute, sword raised to the burning sky.
  field(g, t, ground) {
    this.sky(g, 0x0a0410, 0x5a1a0e);
    const glow = 0.5 + 0.1 * Math.sin(t * 0.13) + 0.06 * Math.sin(t * 0.41);
    g.fillStyle(0xff7a2a, 0.18 * glow); g.fillCircle(470, 170, 130); g.fillStyle(0xffb04a, 0.18 * glow); g.fillCircle(470, 170, 70);
    g.fillStyle(0x1a0806, 1);                                               // the hill and the castle on it
    g.fillEllipse(470, 230, 380, 90);
    g.fillRect(410, 120, 120, 80); g.fillRect(396, 96, 28, 104); g.fillRect(516, 90, 28, 110); g.fillRect(456, 70, 30, 60);
    for (const [x, y, w] of [[396, 90, 28], [516, 84, 28], [456, 64, 30]]) for (let i = 0; i < w; i += 8) g.fillRect(x + i, y, 5, 6);
    g.fillStyle(0xffb04a, 0.9); g.fillRect(466, 90, 8, 12); g.fillRect(420, 140, 8, 10); g.fillRect(500, 136, 8, 10);   // windows, lit by the fire
    for (let i = 0; i < 9; i++) {                                           // the flames on it
      const x = 400 + i * 17, h = 20 + Math.abs(Math.sin(t * 0.17 + i * 1.7)) * 30 + (i % 3) * 8, y = 100 + (i % 4) * 14;
      g.fillStyle(0xff5a1a, 0.85); g.fillTriangle(x - 8, y + 20, x + 8, y + 20, x + Math.sin(t * 0.2 + i) * 4, y + 20 - h);
      g.fillStyle(0xffd04a, 0.85); g.fillTriangle(x - 4, y + 20, x + 4, y + 20, x + Math.sin(t * 0.2 + i) * 3, y + 20 - h * 0.55);
    }
    for (let i = 0; i < 6; i++) { g.fillStyle(0x2a1210, 0.35); g.fillCircle(470 + Math.sin(t * 0.01 + i) * 30 - i * 14, 70 - i * 16 - (t * 0.3 % 16), 18 + i * 4); }   // smoke
    g.fillStyle(0x0e0606, 1); g.fillRect(0, ground, W, H - ground);       // the field
    g.fillStyle(0x2a1208, 1); g.fillRect(0, ground, W, 2);
    for (let x = 0; x < W; x += 7) { g.fillStyle(0x1a0a06, 1); g.fillRect(x, ground - 3 - (x * 13 % 5), 2, 4 + (x * 13 % 5)); }   // grass
  }
  embers(g, t, n = 40) {
    for (let i = 0; i < n; i++) {
      const sp = this.spots[i % 40], x = (sp[0] * W + t * (1 + sp[2]) + i * 31) % W, y = H - ((sp[1] * H + t * (0.8 + sp[2] * 1.4)) % H);
      g.fillStyle(i % 3 ? 0xff8a2a : 0xffe08a, 0.9); g.fillRect(x, y, 2, 2);
    }
  }
  villagers(g, ground) {                                                    // the people she kept safe, huddled behind her
    for (const [x, h, kid] of [[96, 34, 0], [116, 22, 1], [134, 36, 0], [150, 20, 1], [70, 30, 0]]) {
      g.fillStyle(0x0c0406, 1); g.fillRect(x - 5, ground - h, 10, h); g.fillCircle(x, ground - h - 5, kid ? 4 : 5);
      g.fillRect(x - 7, ground - h + 4, 14, h * 0.5);
    }
  }
  hkKneel() { return [[430, 302, 1.7, -0.12, 0.95, 1], [500, 302, 1.7, -0.12, 0.95, 1], [566, 302, 1.7, -0.12, 0.95, 1]]; }
  shot_hero_knight_field(t, k, s) {
    const ground = 300;
    this.field(this.bg, t, ground);
    this.villagers(this.bg, ground);
    this.idle(W / 2 - 10, ground, 3, t);
    this.posLosers(this.hkKneel(), 0x0c0406);
    for (const l of this.losers) if (l.def) l.s.setFlipX(!l.def.facesLeft);
    this.embers(this.fx, t);
    if (s === 1) sfx('flame', 0.5, 0.6);
    if (s % 40 === 20) sfx('flame', 0.2, 0.5);
    this.vignette(this.over);
  }
  shot_hero_knight_close(t, k, s) {
    this.sky(this.bg, 0x140608, 0x6a2410);
    this.bg.fillStyle(0xff7a2a, 0.15); this.bg.fillCircle(W - 120, 200, 160);
    this.hideLosers();
    this.closeUp(W / 2, 150, 6.4 + k * 0.7, t);
    this.hero.setTint(0xffd8b8).setTintMode(Phaser.TintModes.MULTIPLY);
    this.embers(this.fx, t * 2, 60);
    if (s === 8) sfx('whoosh', 0.4, 0.6);
    this.vignette(this.over, 0.8);
  }
  shot_hero_knight_salute(t, k, s) {
    const ground = 300;
    this.field(this.bg, t, ground);
    this.villagers(this.bg, ground);
    this.move('taunt', Math.min(20, s * 0.4), W / 2 - 10, ground, 3);    // the Blade Salute, held with the sword raised
    this.posLosers(this.hkKneel(), 0x0c0406);
    for (const l of this.losers) if (l.def) l.s.setFlipX(!l.def.facesLeft);
    if (s === 4) sfx('whoosh', 0.5, 1.3);
    if (s === 48) { sfx('shing', 0.8, 1.1); this.glint = s; }
    if (this.glint && s - this.glint < 24) {                               // the glint off the raised sword
      const a = 1 - (s - this.glint) / 24, x = W / 2 - 10 - 90, y = ground - 234;   // (the sword's tip, in that frame)
      this.fx.fillStyle(0xffffff, a); this.fx.fillTriangle(x - 30 * a, y, x + 30 * a, y, x, y - 3); this.fx.fillTriangle(x - 30 * a, y, x + 30 * a, y, x, y + 3);
      this.fx.fillTriangle(x, y - 30 * a, x, y + 30 * a, x - 3, y); this.fx.fillTriangle(x, y - 30 * a, x, y + 30 * a, x + 3, y);
    }
    this.embers(this.fx, t);
    this.vignette(this.over);
  }

  // ================================================================ NU
  // A nu-metal frontman who turns every fight into a show. A packed arena: the amp stacks, the lights sweeping,
  // the crowd's hands up - and the beaten crowd-surfed off over their heads. A strobing close-up. Then the encore:
  // pyro, confetti, and the mic hits the floor.
  arena(g, t, floor) {
    this.sky(g, 0x050208, 0x1a0a24);
    g.fillStyle(0x16161c, 1); g.fillRect(0, 40, W, 10);                         // the lighting truss
    for (let x = 10; x < W; x += 20) { g.lineStyle(1, 0x2a2a34, 1); g.lineBetween(x, 40, x + 10, 50); }
    for (let i = 0; i < 6; i++) {                                               // spotlights, sweeping
      const lx = 60 + i * 104, a = Math.sin(t * 0.03 + i * 1.3) * 0.5, col = i % 2 ? 0x9be32a : 0xf2f3f3;
      g.fillStyle(col, 0.07); g.fillTriangle(lx - 4, 50, lx + 4, 50, lx + Math.sin(a) * 260 + 50, floor); g.fillTriangle(lx - 4, 50, lx + Math.sin(a) * 260 - 50, floor, lx + Math.sin(a) * 260 + 50, floor);
      g.fillStyle(col, 0.9); g.fillRect(lx - 4, 48, 8, 5);
    }
    for (const ax of [70, 570]) {                                               // the amp stacks
      for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
        const x = ax - 50 + c * 50, y = floor - 48 - r * 48;
        g.fillStyle(0x0c0c10, 1); g.fillRect(x, y, 48, 46); g.fillStyle(0x6fbf1a, 1); g.fillRect(x, y, 48, 2);
        g.fillStyle(0x1e1e26, 1); g.fillCircle(x + 24, y + 24, 16 + (t % 30 < 3 ? 1 : 0)); g.fillStyle(0x07070a, 1); g.fillCircle(x + 24, y + 24, 6);
      }
    }
    g.fillStyle(0x121218, 1); g.fillRect(0, floor, W, 14); g.fillStyle(0x9be32a, 1); g.fillRect(0, floor, W, 2);   // the stage
    g.fillStyle(0x0a0a0e, 1); g.fillRect(0, floor + 14, W, H - floor);
  }
  crowd(g, t, top) {                                                            // hands up, jumping on the beat
    const jump = t % 30 < 6 ? -4 : 0;
    for (let i = 0; i < 26; i++) {
      const x = i * 26 - 6 + (i % 2) * 8, y = top + (i % 3) * 6 + ((i + Math.floor(t / 30)) % 2 ? jump : 0);
      g.fillStyle(0x050407, 1); g.fillCircle(x, y, 9); g.fillRect(x - 11, y + 6, 22, 40);
      if (i % 2) { g.fillRect(x - 12, y - 22, 4, 22); g.fillRect(x + 8, y - 22, 4, 22); g.fillRect(x - 14, y - 26, 6, 5); g.fillRect(x + 8, y - 26, 6, 5); }   // horns up
    }
  }
  shot_nu_stage(t, k, s) {
    const floor = 262;
    this.arena(this.bg, t, floor);
    this.move('taunt', (s * 0.6) % 84, W / 2, floor, 3);                   // the headbang
    // the beaten, crowd-surfed off over everyone's heads
    this.posLosers([0, 1, 2].map((i) => [((s * 1.6 + i * 200) % (W + 160)) - 80, 282 + Math.sin(s * 0.2 + i) * 4, 1.8, Math.PI / 2 * (i % 2 ? 1 : -1), 0.95]), 0x3a2a4a);
    this.crowd(this.fx, t, 312);
    if (s % 30 === 0) sfx('hit', 0.25, 0.55);                                  // the kick drum
    if (s === 1) sfx('go', 0.4, 0.8);
    this.vignette(this.over);
  }
  shot_nu_close(t, k, s) {
    const strobe = Math.floor(s / 5) % 2;
    this.sky(this.bg, strobe ? 0x0a1404 : 0x020302, strobe ? 0x3a6a0a : 0x0a0a0e);
    this.hideLosers();
    this.closeUp(W / 2, 160, 6.6 + k * 0.6, t);
    this.hero.setTint(strobe ? 0xd8ffb0 : 0xffffff).setTintMode(Phaser.TintModes.MULTIPLY);
    if (s % 10 === 0) sfx('hit', 0.3, 0.5);
    for (let i = 0; i < 10; i++) { const sp = this.spots[i]; this.fx.fillStyle(0x9be32a, 0.8); this.fx.fillRect((sp[0] * W + s * 6 * sp[2]) % W, sp[1] * H, 3, 3); }
    this.vignette(this.over, 0.8);
  }
  shot_nu_encore(t, k, s) {
    const floor = 262;
    this.arena(this.bg, t, floor);
    this.hideLosers();
    const MD = 120, drop = MD + 29;                                             // the mic drop: arm out at MD, lets go at 'drop'
    if (s < MD) this.move('taunt', Math.min(83, 40 + s * 0.3), W / 2, floor, 3);
    else this.move('micdrop', (s - MD) * 0.5, W / 2, floor, 3);
    if (s >= drop) {                                                            // the lights cut to one spot on him... and the mic falls
      const d = s - drop, k = Math.min(1, d / 6);
      this.mid.fillStyle(0x000000, 0.75 * k); this.mid.fillRect(0, 0, W, H);
      this.mid.fillStyle(0xf2f3f3, 0.12 * k); this.mid.fillTriangle(W / 2 - 6, 50, W / 2 + 6, 50, W / 2 + 80, floor); this.mid.fillTriangle(W / 2 - 6, 50, W / 2 - 50, floor, W / 2 + 80, floor);
      this.mid.fillStyle(0xf2f3f3, 0.2 * k); this.mid.fillEllipse(W / 2 + 14, floor + 2, 140, 10);
      const g0 = 0.5, T = Math.sqrt(2 * 120 / g0);                               // falls 120 px from his fist
      let mx = W / 2 + 51 + Math.min(d, T) * 0.4, my = floor - 120 + 0.5 * g0 * Math.min(d, T) ** 2, rot = Math.min(d, T) * 0.12;
      if (d >= T) {                                                             // ...hits the stage, one little bounce, lies there
        const b = d - T, hop = b < 12 ? Math.sin(b / 12 * Math.PI) * 10 : 0;
        mx = W / 2 + 51 + T * 0.4 + Math.min(b, 12) * 0.8; my = floor - 4 - hop; rot = 1.57 + Math.min(b, 12) * 0.1;
        if (b === 0) { sfx('clang', 1, 0.5); sfx('bighit', 0.6, 0.4); this.cameras.main.shake(220, 0.012); this.flash = 3; }
        if (b === 2) sfx('buzz', 0.7, 2.4);                                     // feedback, screeching through the speakers
        if (b === 12) sfx('clang', 0.4, 0.7);
        if (b < 30) { this.fx.lineStyle(2, 0x9be32a, 1 - b / 30); this.fx.strokeEllipse(mx, floor, b * 8, b * 1.6); }   // the thud rippling out
      }
      this.drawMic(this.fx, mx, my, rot);
    }
    for (const px of (s < drop ? [150, 490] : [])) {                           // the pyro (stops when the mic drops)
      const on = s % 40 < 22, h = on ? 90 + Math.sin(s * 0.6) * 20 : 0;
      if (s % 40 === 0) { sfx('flame', 0.6, 0.8); this.cameras.main.shake(80, 0.004); }
      if (h) { this.mid.fillStyle(0xff7a1a, 0.9); this.mid.fillTriangle(px - 16, floor, px + 16, floor, px, floor - h); this.mid.fillStyle(0x9be32a, 0.9); this.mid.fillTriangle(px - 8, floor, px + 8, floor, px, floor - h * 0.6); }
    }
    for (let i = 0; i < (s < drop ? 40 : 0); i++) {                            // confetti
      const sp = this.spots[i], x = (sp[0] * W + Math.sin(s * 0.05 + i) * 20) % W, y = ((sp[1] * H + s * (1 + sp[2])) % H);
      this.fx.fillStyle([0x9be32a, 0xffffff, 0xff5ad0, 0xffd23a][i % 4], 1); this.fx.fillRect(x, y, 3, 2);
    }
    this.crowd(this.fx, t, 312);
    this.vignette(this.over);
  }

  drawMic(g, x, y, rot) {                                                       // NU's mic, at 3x: chrome handle, grille, a green glow
    const c = Math.cos(rot), sn = Math.sin(rot), at = (d) => [x + sn * d, y - c * d];
    const [hx, hy] = at(-12), [gx, gy] = at(6);
    g.lineStyle(7, 0x2a2e38, 1); g.lineBetween(hx, hy, gx, gy);
    g.lineStyle(4, 0xa8b2be, 1); g.lineBetween(hx, hy, gx, gy);
    g.fillStyle(0x2a2e38, 1); g.fillCircle(...at(10), 8); g.fillStyle(0xdce4ec, 1); g.fillCircle(...at(10), 6.5);
    g.fillStyle(0x6c7684, 1); for (const [ox, oy] of [[-2, -2], [2, -2], [0, 0], [-2, 2], [2, 2]]) { const [px, py] = at(10); g.fillRect(px + ox - 1, py + oy - 1, 2, 2); }
    g.fillStyle(0x9be32a, 0.9); g.fillCircle(...at(10), 2);
    g.lineStyle(2, 0x24212c, 1); const [cx, cy] = at(-12); g.lineBetween(cx, cy, cx - 8, cy + 6);   // a bit of cable
  }

  // ================================================================ AERO
  // Glossy glass, aqua skies, bubbles: the old desktop dream. On a green hill under a lens-flared sun, the beaten
  // drift away sealed in bubbles. A close-up with a shine sweeping across the glass. Then the bubbles pop, the sky
  // turns gold, and he rises as FULL AERO with his golden spear.
  aeroSky(g, t, hill, gold = 0) {
    this.sky(g, gold ? 0x2a6ab8 : 0x2a8ae0, gold ? 0xfff0b0 : 0xc8f0ff);
    const sx = 500, sy = 80;
    g.fillStyle(0xffffff, 0.25); g.fillCircle(sx, sy, 60); g.fillStyle(0xffffff, 0.5); g.fillCircle(sx, sy, 30); g.fillStyle(0xffffff, 1); g.fillCircle(sx, sy, 16);   // the sun
    for (let i = 1; i < 5; i++) { g.fillStyle([0x9ff0ff, 0xffd8ff, 0xb8ffb0, 0xffffff][i - 1], 0.18); g.fillCircle(sx - i * 70, sy + i * 40, 10 + i * 4); }   // the lens flare
    if (gold) for (let i = 0; i < 12; i++) {                                    // golden rays
      const a = t * 0.01 + i * Math.PI / 6;
      g.fillStyle(0xffd23a, 0.12 * gold); g.fillTriangle(W / 2, 160, W / 2 + Math.cos(a) * 500, 160 + Math.sin(a) * 500, W / 2 + Math.cos(a + 0.15) * 500, 160 + Math.sin(a + 0.15) * 500);
    }
    g.fillStyle(0x2e9a3a, 1); g.fillEllipse(140, hill + 60, 520, 160); g.fillEllipse(520, hill + 70, 520, 170);   // glossy green hills
    g.fillStyle(0x5ad05a, 1); g.fillEllipse(320, hill + 50, 560, 120);
    g.fillStyle(0xb8ff9a, 0.5); g.fillEllipse(300, hill + 6, 380, 16);
    g.fillStyle(0x1e7a2a, 1); g.fillRect(0, hill + 60, W, H);
  }
  bubble(g, x, y, r, a = 1) {
    g.fillStyle(0xc8f4ff, 0.18 * a); g.fillCircle(x, y, r);
    g.lineStyle(2, 0xffffff, 0.7 * a); g.strokeCircle(x, y, r);
    g.fillStyle(0xffffff, 0.8 * a); g.fillEllipse(x - r * 0.4, y - r * 0.45, r * 0.5, r * 0.25);
  }
  aeroLosers(s, pop = -1) {                                                    // floating away, each in its bubble
    const pos = [0, 1, 2].map((i) => [120 + i * 200 + Math.sin(s * 0.03 + i) * 20, 210 - s * (0.35 + i * 0.1) - i * 20 + Math.sin(s * 0.05 + i * 2) * 6]);
    this.posLosers(pos.map(([x, y], i) => [x, y + 30, 1.3, Math.sin(s * 0.04 + i) * 0.4, pop >= 0 && s > pop + i * 6 ? 0 : 0.9]), 0x0d3550);
    pos.slice(0, this.losers.length).forEach(([x, y], i) => {
      if (pop >= 0 && s > pop + i * 6) { if (s === pop + i * 6 + 1) { sfx('dodge', 0.4, 1.6); } const r = (s - pop - i * 6) * 4; if (r < 50) { this.fx.lineStyle(2, 0xffffff, 1 - r / 50); this.fx.strokeCircle(x, y + 10, 34 + r); } return; }
      this.bubble(this.fx, x, y + 10, 34);
    });
  }
  shot_aero_sky(t, k, s) {
    const hill = 236;
    this.aeroSky(this.bg, t, hill);
    this.idle(W / 2, hill + 4, 3, t);
    this.aeroLosers(s);
    for (let i = 0; i < 14; i++) { const sp = this.spots[i]; this.bubble(this.fx, (sp[0] * W + Math.sin(s * 0.03 + i) * 10), H - ((sp[1] * H + s * (0.6 + sp[2])) % H), 4 + sp[2] * 8, 0.8); }
    if (s === 1) sfx('petal', 0.5, 1.2);
    this.vignette(this.over, 0.3);
  }
  shot_aero_close(t, k, s) {
    this.sky(this.bg, 0x2a8ae0, 0xc8f0ff);
    this.hideLosers();
    this.closeUp(W / 2, 160, 6.6 + k * 0.6, t);
    const sx = -200 + s * 12;                                                   // a glossy shine sweeping across
    this.fx.fillStyle(0xffffff, 0.35); this.fx.fillTriangle(sx, 0, sx + 60, 0, sx - 140, H); this.fx.fillTriangle(sx + 60, 0, sx - 80, H, sx - 140, H);
    this.fx.fillStyle(0xffffff, 0.2); this.fx.fillTriangle(sx + 80, 0, sx + 100, 0, sx - 40, H); this.fx.fillTriangle(sx + 100, 0, sx - 20, H, sx - 40, H);
    if (s === 20) sfx('shing', 0.5, 1.4);
    for (let i = 0; i < 10; i++) { const sp = this.spots[i + 14]; this.bubble(this.fx, sp[0] * W, H - ((sp[1] * H + s * 2) % H), 5 + sp[2] * 10, 0.7); }
    this.vignette(this.over, 0.4);
  }
  shot_aero_ascend(t, k, s) {
    const hill = 236, gold = Math.min(1, s / 40), up = Math.min(60, s * 0.8);
    this.aeroSky(this.bg, t, hill, gold);
    this.aeroLosers(s + 84, 84);                                                // their bubbles pop
    if (s < 10) this.idle(W / 2, hill + 4, 3, t);
    else {
      if (s === 10) { sfx('limitready', 0.6, 1); this.flash = 5; }
      this.idle(W / 2, hill + 4 - up + Math.sin(s * 0.08) * 4, 3, t, false, AERO_FULL);   // FULL AERO, floating up
      this.mid.fillStyle(0xffd23a, 0.25 * gold); this.mid.fillCircle(W / 2, hill - 90 - up, 70); this.mid.fillStyle(0xfff4c0, 0.3 * gold); this.mid.fillCircle(W / 2, hill - 90 - up, 36);
    }
    for (let i = 0; i < 16; i++) { const sp = this.spots[i], a = s * 0.04 + i * 0.39, r = 90 + sp[2] * 30; this.fx.fillStyle(0xffe680, 0.9 * gold); this.fx.fillRect(W / 2 + Math.cos(a) * r, hill - 90 - up + Math.sin(a) * r * 0.6, 2, 2); }   // golden sparkles
    this.vignette(this.over, 0.3);
  }

  // ================================================================ WHAT ONCE WAS
  // Lost in the Backrooms so long it became part of them. The endless yellow halls, the hum of the lights - and the
  // beaten, already up on the walls as MISSING posters. Its TV screen up close: static, then Mason's faces. Then the
  // lights go out, one by one, until there's nothing but its screen glowing in the dark.
  hall(g, t, floor, lightsOn = 6) {
    const vx = W / 2, vy = 150;
    g.fillStyle(0xc8b450, 1); g.fillRect(0, 0, W, H);                          // the wallpaper
    for (let x = 0; x < W; x += 10) { g.fillStyle(0xb8a440, 1); g.fillRect(x, 0, 2, floor); }
    g.fillStyle(0xd8c870, 1); g.fillRect(vx - 70, vy - 50, 140, 100);           // the far end of the hall
    g.fillStyle(0x8a7a3a, 1); g.fillTriangle(0, floor, W, floor, vx + 70, vy + 50); g.fillTriangle(0, floor, vx - 70, vy + 50, vx + 70, vy + 50);   // the damp carpet
    g.fillRect(0, floor, W, H - floor);
    g.fillStyle(0xe8e0b8, 1); g.fillTriangle(0, 34, W, 34, vx + 70, vy - 50); g.fillTriangle(0, 34, vx - 70, vy - 50, vx + 70, vy - 50);   // the ceiling tiles
    g.lineStyle(1, 0xb8b090, 1); for (let i = 0; i < 6; i++) { const f = i / 6; g.lineBetween(f * W, 34, vx - 70 + f * 140, vy - 50); }
    g.lineStyle(1, 0xa8984a, 1); g.lineBetween(0, 34, vx - 70, vy - 50); g.lineBetween(W, 34, vx + 70, vy - 50); g.lineBetween(0, floor, vx - 70, vy + 50); g.lineBetween(W, floor, vx + 70, vy + 50);
    for (let i = 0; i < 6; i++) {                                               // the fluorescent panels, nearest first
      const f = 1 - i / 6, y = 34 + (vy - 50 - 34) * (1 - f) + 4, w = 40 + 100 * f, on = i < 6 - lightsOn ? 0 : ((t * 7 + i * 13) % 97 < 3 ? 0.4 : 1);
      g.fillStyle(on ? 0xffffe8 : 0x6a6a5a, 1); g.fillRect(vx - w / 2, y, w, 4 + 6 * f);
      if (on) { g.fillStyle(0xffffe0, 0.08 * on); g.fillEllipse(vx, y + 20 * f, w * 2, 40 * f); }
    }
    const dark = 1 - lightsOn / 6;                                              // as the lights go, the dark comes in
    if (dark > 0) { g.fillStyle(0x000000, Math.min(0.97, dark * 1.1)); g.fillRect(0, 0, W, H); }
  }
  posters(lightsOn = 6) {                                                       // the beaten, up on the walls: MISSING
    const spots = [[70, 120], [570, 120], [120, 210]];
    this.posLosers(spots.map(([x, y]) => [x, y + 30, 0.9, 0, lightsOn < 2 ? 0 : 1]), 0x2a2414);
    spots.slice(0, this.losers.length).forEach(([x, y]) => {
      this.bg.fillStyle(0xf2eee0, lightsOn < 2 ? 0 : 1); this.bg.fillRect(x - 30, y - 40, 60, 80);
      this.bg.fillStyle(0xc81a24, lightsOn < 2 ? 0 : 1); this.bg.fillRect(x - 30, y - 40, 60, 10);
      this.bg.fillStyle(0x3a3a3a, lightsOn < 2 ? 0 : 1); for (let i = 0; i < 3; i++) this.bg.fillRect(x - 22, y + 30 + i * 3, 44 - i * 10, 1);
    });
  }
  shot_what_once_was_hall(t, k, s) {
    const floor = 300;
    this.hall(this.bg, t, floor);
    this.posters();
    this.idle(W / 2, 270, 2.6, t);
    if (s % 24 === 0) sfx('buzz', 0.2, 0.5);
    if (s === 1) sfx('glitch', 0.4, 0.6);
    this.vignette(this.over, 0.7);
  }
  shot_what_once_was_screen(t, k, s) {
    const g = this.bg, cx = W / 2, cy = 170, sw = 300, sh = 220;
    this.hideLosers(); this.hero.setVisible(false);
    g.fillStyle(0x0a0804, 1); g.fillRect(0, 0, W, H);
    g.fillStyle(0x4a3a24, 1); g.fillRect(cx - sw / 2 - 30, cy - sh / 2 - 26, sw + 60, sh + 52);   // the set's casing
    g.fillStyle(0x2a2014, 1); g.fillRect(cx - sw / 2 - 12, cy - sh / 2 - 10, sw + 24, sh + 20);
    const row = this.def.screenRow ? (this.def.screenRow[skinInfo(this.def.id, this.win.skin || 0).style] || 0) : 0;
    const face = s < 14 ? -1 : s < 34 ? 1 : s < 40 ? -1 : s < 60 ? 0 : s < 66 ? -1 : 2;   // static - stare - static - grimace - static - grin
    if (face < 0) {                                                             // static
      if (s % 3 === 0) sfx('glitch', 0.2, 1.4);
      for (let i = 0; i < 180; i++) { this.fx.fillStyle(Math.random() < 0.5 ? 0xe8e8e8 : 0x3a3a3a, 1); this.fx.fillRect(cx - sw / 2 + Math.floor(Math.random() * sw / 4) * 4, cy - sh / 2 + Math.floor(Math.random() * sh / 4) * 4, 4, 4); }
    } else {
      this.faceImg.setFrame(row * 3 + face).setPosition(cx, cy).setScale(sw / 11, sh / 9).setVisible(true);
      if (s === 14 || s === 40 || s === 66) { sfx('ding', 0.4, 0.6); this.cameras.main.shake(60, 0.004); }
    }
    for (let y = cy - sh / 2; y < cy + sh / 2; y += 4) { this.front.fillStyle(0x000000, 0.18); this.front.fillRect(cx - sw / 2, y, sw, 2); }   // scanlines
    this.front.fillStyle(0xffffff, 0.08); this.front.fillEllipse(cx - 60, cy - 60, 140, 60);       // the glass, catching the light
    this.vignette(this.over, 0.9);
  }
  shot_what_once_was_lightsout(t, k, s) {
    const floor = 300, lights = Math.max(0, 6 - Math.floor(s / 12));
    if (s % 12 === 0 && s < 72) { sfx('clang', 0.3, 0.5 + s * 0.005); }      // clunk... clunk... clunk...
    this.hall(this.bg, t, floor, lights);
    this.posters(lights);
    this.idle(W / 2, 270, 2.6, t);
    if (lights < 6) this.hero.setTint(lights > 1 ? 0x8a8070 : 0x161410).setTintMode(Phaser.TintModes.MULTIPLY);
    if (lights < 3) {                                                           // only its screen, glowing
      const [hx, hy, ox, oy] = HEAD.wow_idle, x = W / 2 + (hx - ox) * 2.6, y = 270 + (hy - oy) * 2.6;
      this.fx.fillStyle(0x9ab8ff, 0.08); this.fx.fillCircle(x, y, 26); this.fx.fillStyle(0xd8e8ff, 0.6 + 0.2 * Math.sin(s * 0.5)); this.fx.fillRect(x - 9, y - 6, 17, 12);
    }
    this.vignette(this.over, 0.6);
  }

  // ================================================================ ROSEMARY
  // She went missing. Something came back. A rainy street at night, her posters on the telephone pole; she stands
  // under the one streetlight, holding one of them. The light flickers - and every time it comes back, she isn't
  // quite who's standing there. Then it's SEEN, dragging its axe, under a light gone red.
  street(g, t, ground, lampOn = 1, red = 0) {
    this.sky(g, 0x020308, 0x0e1420);
    for (const [x, w, h] of [[0, 90, 170], [100, 70, 210], [180, 110, 150], [420, 80, 230], [510, 130, 180]]) {   // buildings, a few lit windows
      g.fillStyle(0x080a12, 1); g.fillRect(x, ground - h, w, h);
      for (let i = 0; i < 6; i++) if ((x + i * 7) % 5 === 0) { g.fillStyle(0xe8c86a, 0.35); g.fillRect(x + 8 + (i % 3) * 22, ground - h + 14 + Math.floor(i / 3) * 30, 8, 10); }
    }
    g.fillStyle(0x0a0c12, 1); g.fillRect(0, ground, W, H - ground);           // the wet road
    g.fillStyle(0x161a24, 1); g.fillRect(0, ground, W, 3);
    const lx = 250, col = red ? 0xff3a2a : 0xffe8a0;
    g.fillStyle(0x1a1c24, 1); g.fillRect(lx - 3, ground - 200, 6, 200); g.fillRect(lx - 3, ground - 200, 40, 5);   // the streetlight
    g.fillStyle(lampOn ? col : 0x2a2a30, 1); g.fillRect(lx + 28, ground - 196, 14, 6);
    if (lampOn) {
      g.fillStyle(col, 0.1 * lampOn); g.fillTriangle(lx + 28, ground - 190, lx + 42, ground - 190, lx + 140, ground); g.fillTriangle(lx + 28, ground - 190, lx - 60, ground, lx + 140, ground);
      g.fillStyle(col, 0.18 * lampOn); g.fillEllipse(lx + 40, ground + 6, 220, 18);
      for (let i = 0; i < 5; i++) { g.fillStyle(col, 0.08 * lampOn); g.fillRect(lx + 10 + i * 12, ground + 10 + i * 6, 40, 2); }   // its reflection in the road
    }
    g.fillStyle(0x1a140e, 1); g.fillRect(520, ground - 210, 8, 210); g.fillRect(500, ground - 200, 48, 4);   // the telephone pole...
    for (const [px, py, r] of [[514, ground - 150, -0.08], [534, ground - 118, 0.1], [508, ground - 90, 0.05]]) {   // ...and her posters on it
      const fl = Math.sin(t * 0.2 + px) * 2;
      g.fillStyle(0xe8e4d4, 0.9); g.fillRect(px - 10, py - 12 + fl * r * 10, 20, 26);
      g.fillStyle(0xc81a24, 0.9); g.fillRect(px - 10, py - 12 + fl * r * 10, 20, 5);
      g.fillStyle(0x6a4a2a, 0.9); g.fillRect(px - 4, py - 4 + fl * r * 10, 8, 9);
    }
  }
  roseLosers(a = 0.9) { this.posLosers([[90, 304, 1.8, 1.45, a], [600, 306, 1.8, -1.45, a], [420, 310, 1.8, 1.5, a]], 0x05060a); }
  shot_last_seen_street(t, k, s) {
    const ground = 296;
    this.street(this.bg, t, ground);
    this.roseLosers();
    this.idle(290, ground, 3, t);                                               // under the light, holding her poster
    this.rain(this.fx, t, 0x9ab0d0, 0.35);
    if (s === 1) sfx('curse', 0.3, 0.8);
    this.vignette(this.over, 0.7);
  }
  shot_last_seen_flicker(t, k, s) {
    const ground = 296, beat = Math.floor(s / 12), on = s % 12 < 7;
    this.street(this.bg, t, ground, on ? 1 : 0);
    this.roseLosers(on ? 0.9 : 0.2);
    if (s % 12 === 0 || s % 12 === 7) sfx('buzz', 0.3, on ? 1 : 0.6);
    if (on) {                                                                   // every time the light comes back: closer, and not her
      const wrong = beat % 2 === 1, sc = 3 + beat * 0.35, y = ground + beat * 10;
      if (wrong) { this.idle(290, y, sc, t, false, SEEN); if (s % 12 === 0) sfx('glitch', 0.5, 0.6); }
      else this.idle(290, y, sc, t);
    } else {
      this.hero.setVisible(false);
      this.fx.fillStyle(0xffffff, 0.9); this.fx.fillRect(300 + beat * 6, ground - 140 + beat * 4, 3, 2);   // just an eye in the dark
    }
    this.rain(this.fx, t, 0x9ab0d0, on ? 0.35 : 0.15);
    this.vignette(this.over, 0.8);
  }
  // she's back - herself again - and she breaks down: shaking, tears running down her face
  shot_last_seen_cry(t, k, s) {
    this.sky(this.bg, 0x04060c, 0x141c2c);
    this.glow(this.bg, W / 2 - 120, 40, 200, 0xffe8a0, 0.3);                  // the streetlight, somewhere above
    this.hideLosers();
    const sob = (s % 26) < 8 ? Math.sin((s % 26) / 8 * Math.PI) * 3 : 0, sc = 6.2 + k * 0.5, cx = W / 2, cy = 150 + sob;
    this.closeUp(cx, cy, sc, t);
    this.hero.setTint(0xc8d4ec).setTintMode(Phaser.TintModes.MULTIPLY);
    if (s % 26 === 0) sfx('curse', 0.18, 1.7);                                 // a sob
    const ex = cx + 3 * sc, ey = cy + 1 * sc;                                  // her eye (head at 34,11; the eye at 37,12)
    this.fx.fillStyle(0xbcd8ff, 0.85); this.fx.fillRect(ex - 2, ey + 6, 3, Math.min(70, s * 1.2));   // a tear track down her cheek
    for (let i = 0; i < 4; i++) {                                              // tears, welling and falling
      const p = (s * 1.5 + i * 22) % 90;
      this.fx.fillStyle(0xe0f0ff, 1); this.fx.fillCircle(ex - 1, ey + 6 + p * 1.6, 2.5 - p / 60);
    }
    this.rain(this.fx, t, 0x9ab0d0, 0.3);
    this.vignette(this.over, 0.9);
  }
  // she looks up into an old mirror - and what looks back is the animatronic
  shot_last_seen_mirror(t, k, s) {
    const g = this.bg, floor = 300, mx = 430, mw = 150, top = 92, swap = 54;
    this.hideLosers();
    g.fillStyle(0x10140e, 1); g.fillRect(0, 0, W, H);                             // a bare room: peeling wallpaper, floorboards
    for (let x = 0; x < W; x += 16) { g.fillStyle(0x161c14, 1); g.fillRect(x, 0, 6, floor); }
    g.fillStyle(0x0e0a08, 1); g.fillRect(0, floor, W, H - floor);
    for (let x = 0; x < W; x += 40) { g.fillStyle(0x080604, 1); g.fillRect(x, floor, 2, H - floor); }
    const flick = s >= swap - 4 && s < swap + 2 ? (s % 2 ? 0 : 0.4) : 1;          // the bulb flickers once, right before
    g.lineStyle(1, 0x2a2a2a, 1); g.lineBetween(300, 0, 300, 50);
    g.fillStyle(flick > 0.5 ? 0xfff0c0 : 0x3a3428, 1); g.fillCircle(300, 54, 5);
    this.glow(g, 300, 54, 190, 0xfff0c0, 0.28 * flick);
    g.fillStyle(0x0a1018, 1); g.fillRect(mx - mw / 2, top, mw, floor - top - 6);  // the mirror's glass
    g.fillStyle(0x14202c, 1); g.fillRect(mx - mw / 2, top, mw, 30);
    // her: facing the mirror; sobbing until she sees it, then frozen
    const sob = s < swap && (s % 26) < 8 ? Math.sin((s % 26) / 8 * Math.PI) * 2 : 0;
    this.idle(250, floor + sob, 3, s < swap ? t : 0);
    this.hero.setTint(flick > 0.5 ? 0xd8d0c0 : 0x3a3a40).setTintMode(Phaser.TintModes.MULTIPLY);
    // the reflection: her, flipped... until the light comes back and it's SEEN looking out at her
    const R = this.hero2, seen = s >= swap;
    showFighter(R, seen ? SEEN : this.def, Math.floor((seen ? t : (s < swap ? t : 0)) / 6), this.win.skin || 0);
    R.setPosition(mx + 6, floor - 8).setScale(2.4).setFlipX(true).setRotation(seen ? Math.sin(s * 0.05) * 0.04 : 0).setAlpha(flick).setVisible(true)
      .setTint(seen ? 0xc0b0a8 : 0x9aa8c0).setTintMode(Phaser.TintModes.MULTIPLY);
    if (s === swap) { sfx('glitch', 0.8, 0.5); sfx('bighit', 0.6, 0.35); this.cameras.main.shake(260, 0.01); this.flash = 4; }
    if (s === swap + 30) sfx('buzz', 0.4, 0.5);
    const f = this.fx;
    f.fillStyle(0x3a2a1a, 1); f.fillRect(mx - mw / 2 - 10, top - 10, mw + 20, 10); f.fillRect(mx - mw / 2 - 10, floor - 6, mw + 20, 10);   // the frame
    f.fillRect(mx - mw / 2 - 10, top, 10, floor - top - 6); f.fillRect(mx + mw / 2, top, 10, floor - top - 6);
    f.fillStyle(0x5a4228, 1); f.fillRect(mx - mw / 2 - 10, top - 10, mw + 20, 2);
    f.fillStyle(0xffffff, 0.06); f.fillTriangle(mx - mw / 2, top, mx - mw / 2 + 50, top, mx - mw / 2, top + 120);   // the glass's sheen
    if (seen) {                                                                   // cracks spreading across the glass from where it's looking
      const n = Math.min(9, Math.floor((s - swap) / 4)), ox = mx + 20, oy = top + 70;
      f.lineStyle(1, 0xd8dce8, 0.7);
      for (let i = 0; i < n; i++) {
        const a = i * 0.7 + 0.3, len = 30 + (i * 37) % 50;
        const x1 = ox + Math.cos(a) * len * 0.5, y1 = oy + Math.sin(a) * len * 0.5;
        f.lineBetween(ox, oy, x1, y1); f.lineBetween(x1, y1, Math.max(mx - mw / 2, Math.min(mx + mw / 2, x1 + Math.cos(a + 0.5) * len * 0.6)), Math.max(top, Math.min(floor - 8, y1 + Math.sin(a + 0.5) * len * 0.6)));
      }
    }
    this.vignette(this.over, 0.8);
  }

}

// WIN CUTSCENES: when Soul Summoner, Mr Wake or Lacy wins a match, a short cinematic about their backstory
// plays before the results (MatchScene.toResults sends the winner here; everyone else goes straight to Results).
// About 6-7 seconds: a few shots - wide, a close-up, a final pose - letterboxed, with hard cuts, white flashes
// and a title card that slams in with the winner's name and a line. The fighters who lost are in it too, as
// black silhouettes. Any button skips it (after half a second).
//
// Each cutscene is a list of shots in CUTS below: [from frame, name]; the scene calls shot_<id>_<name>(t, k)
// every frame of that shot (t = frames since the cutscene started, k = 0..1 through the shot).
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { MenuInput } from './menuInput.js';
import { ROSTER, TEST_ROSTER, showFighter } from '../fighters/roster.js';
import { skinTexture } from '../fighters/skins.js';
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
};
// where each fighter's head is in its idle frame (for the close-ups), and its feet (the sprite origin)
const HEAD = { 'soul-summoner': [34, 11, 32, 59], 'mr-wake': [32, 10, 36, 62], 'hero-knight': [67, 47, 66, 86] };

export function hasWinCutscene(id) { return !!CUTS[id]; }

export class WinScene extends Phaser.Scene {
  constructor() { super('Win'); }
  create(data) {
    this.data0 = data; this.t = 0; this.menu = new MenuInput(this);
    const win = data.results[0];
    this.win = win; this.cut = CUTS[win.fighter];
    this.def = (ROSTER.find((r) => r.id === win.fighter) || ROSTER[0]).def;
    stopMusic();
    this.bg = this.add.graphics();                                         // the set
    this.losers = data.results.slice(1).map((r) => {                       // the fighters who lost, as silhouettes
      const d = ([...ROSTER, ...TEST_ROSTER].find((x) => x.id === r.fighter) || {}).def;   // (test fighters can lose too)
      const s = this.add.sprite(0, 0, (d || this.def).sheets.idle, 0).setVisible(false);
      if (d) showFighter(s, d, 0, r.skin || 0);
      s.setTint(0x000000).setTintMode(Phaser.TintModes.FILL);
      return { s, def: d };
    });
    this.mid = this.add.graphics();                                        // between them and the winner
    this.hero = this.add.sprite(W / 2, 300, this.def.sheets.idle, 0);
    this.fx = this.add.graphics();                                         // in front: wisps, embers, rain, eyes
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
  idle(x, y, sc, t, flip = false) {
    showFighter(this.hero, this.def, Math.floor(t / 6), this.win.skin || 0);
    this.hero.setPosition(x, y).setScale(sc).setFlipX(!!this.def.facesLeft !== flip).setRotation(0).setAlpha(1).clearTint().setVisible(true);
  }
  move(name, i, x, y, sc) {
    const A = this.def.moveAnims[name], key = skinTexture(this, this.def.sheets.moves, this.def.id, this.win.skin || 0);
    this.hero.setTexture(key, A[0] + Math.max(0, Math.min(A[1] - 1, Math.floor(i)))).setOrigin(this.def.movesOrigin[0], this.def.movesOrigin[1])
      .setPosition(x, y).setScale(sc).setFlipX(!!this.def.facesLeft).setRotation(0).setAlpha(1).clearTint().setVisible(true);
  }
  // a close-up: the winner's head at (cx, cy), at scale sc
  closeUp(cx, cy, sc, t) {
    const [hx, hy, ox, oy] = HEAD[this.def.id];
    this.idle(cx + (ox - hx) * sc, cy + (oy - hy) * sc, sc, t);
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
  cutTo() { this.flash = 6; sfx('whoosh', 0.5, 0.7); this.cameras.main.shake(80, 0.004); }

  update() {
    const t = ++this.t, C = this.cut;
    // skip
    const m = this.menu.poll();
    if (t > 30 && (m.ok || m.back || this.clicked || m.pads.some((p) => p.button === 'a' || p.button === 'start' || p.button === 'b'))) return this.done();
    this.clicked = false;
    if (t >= C.len) return this.done();
    this.bg.clear(); this.mid.clear(); this.fx.clear(); this.over.clear();
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
}

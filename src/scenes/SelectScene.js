// Fighter select: a grid of fighters on top, one card per player below, and a cursor for each
// human. Move your cursor onto a fighter and press attack to pick; press special to change your mind.
// Point at a CPU card and press attack to change that CPU's level.
// Colour variations: Q / E (keyboard), X / Y or LB / RB (controller), or click a colour swatch on a card.
import { playMusic } from '../audio/music.js';
import { VIEW_W, VIEW_H, FONT, PLAYER_COLORS, PLAYER_CSS, PLAYER_TINTS, DIFFICULTY } from '../config.js';
import { settings, MODE_NAMES } from '../settings.js';
import { ROSTER, GRID_SLOTS, showFighter } from '../fighters/roster.js';
import { readPad } from '../input/controllers.js';
import { sfx } from '../audio/sfx.js';
import { voiceLine } from '../audio/voiceLines.js';
import { makeButton } from '../ui/button.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { announce } from '../audio/announcer.js';
import { skinsFor, skinInfo, resolveSkins, skinTier, skinUnlocked, stepSkin } from '../fighters/skins.js';
import { getKOs, MILESTONE_KOS } from '../progress.js';
import { ArcadeBg, titleBanner, hintBar, slant, ARC, shade } from '../ui/arcade.js';

const COLS = 6, TILE_W = 72, TILE_H = 50, GAP = 4;
const GRID_X = Math.round((VIEW_W - (COLS * TILE_W + (COLS - 1) * GAP)) / 2), GRID_Y = 30;
const CARD_Y = 148, CARD_H = 196, CARD_GAP = 8;

export class SelectScene extends Phaser.Scene {
  constructor() { super('Select'); }

  create() {
    this.t = 0;
    const s = settings;
    playMusic(this, 'bgm_select');
    // portrait crops (head and shoulders) of each fighter's idle frame
    for (const r of ROSTER) {
      if (!r.def) continue;
      const tex = this.textures.get(r.def.sheets.idle);
      if (!tex.has('portrait')) tex.add('portrait', 0, ...r.def.portrait);
    }

    // ---- who is playing
    this.players = [{ kind: 'kb', pad: s.p1Pad, label: 'P1', input: s.p1Pad !== null ? 'KEYBOARD + PAD ' + (s.p1Pad + 1) : 'KEYBOARD' }];
    s.extraPads.forEach((p) => this.players.push({ kind: 'pad', pad: p, label: 'P' + (this.players.length + 1), input: 'PAD ' + (p + 1) }));
    const humans = this.players.length;
    for (let i = 0; i < s.cpuCount && this.players.length < 4; i++) this.players.push({ kind: 'cpu', label: 'CPU' + (this.players.length + 1), input: 'CPU' });
    this.players.forEach((p, i) => {
      p.slot = i;
      p.pick = p.kind === 'cpu' ? 'random' : null;
      p.skin = s.skins[i] || 0;
      if (p.kind === 'cpu') s.cpuLevels[i] = s.cpuLevels[i] ?? s.difficulty;
      p.x = GRID_X + 30 + i * 40; p.y = GRID_Y + TILE_H + 20; p.prev = {};
    });

    // ---- static layout
    this.bgFx = new ArcadeBg(this, ARC.sections.fight, { second: ARC.gold });
    const g = this.add.graphics();
    titleBanner(this, 'FIGHTER SELECT', ARC.sections.fight, { x: 6, y: 2, size: 9 });
    const mode = this.add.text(VIEW_W - 12, 9, MODE_NAMES[s.mode], { fontFamily: FONT, fontSize: '7px', color: '#ffffff', stroke: '#07060e', strokeThickness: 3 }).setOrigin(1, 0);
    slant(g, mode.x - mode.width - 14, 4, mode.width + 22, 17, ARC.sections.fight, 1, 6);

    // grid tiles
    this.tiles = [];
    for (let i = 0; i < GRID_SLOTS; i++) {
      const col = i % COLS, row = Math.floor(i / COLS);
      const x = GRID_X + col * (TILE_W + GAP), y = GRID_Y + row * (TILE_H + GAP);
      const isRandom = i === GRID_SLOTS - 1;
      const f = isRandom ? { id: 'random', name: 'RANDOM', available: true } : ROSTER[i] || { id: null, name: '???', available: false };
      this.tiles.push({ x, y, f });
      g.fillStyle(0x000000, 0.6); g.fillRect(x + 3, y + 3, TILE_W, TILE_H);                    // hard shadow
      g.fillStyle(f.available ? 0x2a1f5e : 0x120f24, 1); g.fillRect(x, y, TILE_W, TILE_H);
      if (f.available) for (let k = 0; k < 4; k++) slant(g, x + 6 + k * 18, y, 8, TILE_H - 12, 0xffffff, 0.03, 6);   // faint slashes behind the art
      slant(g, x, y + TILE_H - 12, TILE_W, 12, f.available ? 0x07060e : 0x0b0918, 1, 4);
      g.fillStyle(f.available ? ARC.sections.fight : 0x2a2440, 1); g.fillRect(x, y + TILE_H - 13, TILE_W, 1);
      if (f.def && this.hasIcon(f.id)) this.add.image(x, y, 'icon_' + f.id).setOrigin(0);         // close-up icon art (tools/sprites/fighter_icons.py)
      else if (f.def) this.add.image(x + TILE_W / 2, y + 20, f.def.sheets.idle, 'portrait').setFlipX(!!f.def.facesLeft);
      else if (isRandom) this.drawDie(g, x + TILE_W / 2, y + 19);
      else this.drawLocked(g, x + TILE_W / 2, y + 19, false);
      this.add.text(x + TILE_W / 2, y + TILE_H - 6, f.name, { fontFamily: FONT, fontSize: f.name.length > 10 ? '5px' : '6px', color: f.available ? '#ffffff' : '#4a4560', stroke: '#07060e', strokeThickness: 2 }).setOrigin(0.5);
      if (!f.available && f.id === 'mr-wake') this.add.text(x + TILE_W - 3, y + 3, 'SOON', { fontFamily: FONT, fontSize: '5px', color: '#0b0a14', backgroundColor: '#f3c358', padding: { x: 2, y: 1 } }).setOrigin(1, 0);
    }
    this.hoverG = this.add.graphics();

    // player cards
    const n = this.players.length;
    const cardW = Math.floor((VIEW_W - 24 - (n - 1) * CARD_GAP) / n);
    this.cards = this.players.map((p, i) => {
      const x = 12 + i * (cardW + CARD_GAP);
      const card = { x, y: CARD_Y, w: cardW, h: CARD_H, p };
      card.bg = this.add.graphics();
      card.sprite = this.add.sprite(x + cardW / 2, CARD_Y + 150, 'ss_idle', 0).setOrigin(0.5, 59 / 64).setScale(2).setTint(PLAYER_TINTS[i]);
      card.unknown = this.add.text(x + cardW / 2, CARD_Y + 90, '?', { fontFamily: FONT, fontSize: '48px', color: '#3a3360' }).setOrigin(0.5);
      card.tag = this.add.text(x + 10, CARD_Y + 6, p.label, { fontFamily: FONT, fontSize: '11px', color: '#ffffff', stroke: '#07060e', strokeThickness: 4 });
      card.input = this.add.text(x + cardW - 10, CARD_Y + 9, p.input, { fontFamily: FONT, fontSize: '5px', color: '#ffffff' }).setOrigin(1, 0);
      card.name = this.add.text(x + cardW / 2, CARD_Y + 162, '', { fontFamily: FONT, fontSize: '9px', color: '#ffffff', stroke: '#07060e', strokeThickness: 4 }).setOrigin(0.5);
      card.status = this.add.text(x + cardW / 2, CARD_Y + 184, '', { fontFamily: FONT, fontSize: '7px', color: '#c9c4dc' }).setOrigin(0.5);
      card.skinName = this.add.text(x + cardW / 2, CARD_Y + 170, '', { fontFamily: FONT, fontSize: '5px', color: '#c9c4dc' }).setOrigin(0.5, 0).setDepth(2);
      card.swatchG = this.add.graphics().setDepth(2); card.swatches = [];
      card.kos = this.add.text(x + cardW - 10, CARD_Y + 16, '', { fontFamily: FONT, fontSize: '5px', color: '#ffffff' }).setOrigin(1, 0).setDepth(2);
      return card;
    });

    this.cursorG = this.add.graphics().setDepth(20);
    this.cursorTags = this.players.map((p) => p.kind === 'cpu' ? null : this.add.text(0, 0, p.label, { fontFamily: FONT, fontSize: '6px', color: '#ffffff', backgroundColor: PLAYER_CSS[p.slot], padding: { x: 2, y: 1 } }).setDepth(21));

    this.banner = this.add.graphics().setDepth(30);
    this.bannerText = this.add.text(VIEW_W / 2, CARD_Y - 6, 'READY TO FIGHT!   CLICK OR PRESS ENTER / START', { fontFamily: FONT, fontSize: '11px', color: '#ffffff', stroke: '#07060e', strokeThickness: 5 }).setOrigin(0.5).setDepth(31);
    hintBar(this, 'CLICK / J / A PICK   RIGHT / K / B UNDO   Q E / X Y COLOUR   ENTER START   ESC BACK', ARC.sections.fight, { depth: 40 });

    const K = Phaser.Input.Keyboard.KeyCodes;
    // mouse drives player 1's cursor: left click picks, right click undoes, click the yellow bar to start
    this.input.mouse.disableContextMenu();
    addFullscreenButton(this, 532, 3);
    makeButton(this, 196, 3, '< BACK', () => { sfx('menu', 0.6); this.scene.start('StageSelect'); });
    this.mouse = { moved: false, left: false, right: false, x: 0, y: 0 };
    this.input.on('pointermove', (p) => { this.mouse.moved = true; this.mouse.x = p.x; this.mouse.y = p.y; });
    this.input.on('pointerdown', (p) => {
      this.mouse.x = p.x; this.mouse.y = p.y; this.mouse.moved = true;
      if (p.rightButtonDown()) this.mouse.right = true; else this.mouse.left = true;
    });
    this.bannerZone = this.add.zone(0, CARD_Y - 18, VIEW_W, 24).setOrigin(0).setInteractive({ useHandCursor: true }).setDepth(32);
    this.bannerZone.on('pointerdown', (p) => { if (p.leftButtonDown() && this.players.every((pl) => pl.pick)) this.mouse.start = true; });

    this.keys = this.input.keyboard.addKeys({ w: K.W, a: K.A, s: K.S, d: K.D, up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT, j: K.J, k: K.K, q: K.Q, e: K.E, enter: K.ENTER, space: K.SPACE, esc: K.ESC }, false);
  }

  hasIcon(id) { return this.textures.exists('icon_' + id); }

  drawDie(g, cx, cy) {
    g.fillStyle(0xf0f2f3, 1); g.fillRect(cx - 12, cy - 12, 24, 24);
    g.fillStyle(0x1a1020, 1);
    for (const [dx, dy] of [[-6, -6], [6, -6], [0, 0], [-6, 6], [6, 6]]) g.fillRect(cx + dx - 2, cy + dy - 2, 4, 4);
  }
  drawLocked(g, cx, cy, named) {
    // dark silhouette with a question mark
    g.fillStyle(named ? 0x2a2050 : 0x1e1a38, 1);
    g.fillRect(cx - 9, cy - 14, 18, 14); g.fillRect(cx - 14, cy, 28, 14);
    if (named) { g.fillStyle(0x6a3fa0, 1); g.fillRect(cx + 14, cy - 16, 3, 30); g.fillStyle(0xb07ad0, 1); g.fillRect(cx + 12, cy - 20, 7, 6); }
    g.fillStyle(0x4a4560, 1); g.fillRect(cx - 3, cy - 10, 6, 2); g.fillRect(cx + 1, cy - 8, 2, 4); g.fillRect(cx - 1, cy - 4, 2, 3); g.fillRect(cx - 1, cy + 1, 2, 2);
  }

  // read one human's stick and buttons; returns edge-triggered presses
  readPlayer(p) {
    const k = this.keys, JD = Phaser.Input.Keyboard.JustDown;
    let x = 0, y = 0, ok = false, back = false, start = false, skin = 0;
    if (p.kind === 'kb') {
      x = (k.d.isDown || k.right.isDown ? 1 : 0) - (k.a.isDown || k.left.isDown ? 1 : 0);
      y = (k.s.isDown || k.down.isDown ? 1 : 0) - (k.w.isDown || k.up.isDown ? 1 : 0);
      ok = JD(k.j) || JD(k.space); back = JD(k.k); start = JD(k.enter);
      if (JD(k.q)) skin = -1; if (JD(k.e)) skin = 1;
    }
    if (p.pad !== null && p.pad !== undefined) {
      const pad = readPad(p.pad);
      if (pad) {
        const b = (n) => !!(pad.buttons[n] && pad.buttons[n].pressed);
        let ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
        if (Math.abs(ax) < 0.2) ax = 0; if (Math.abs(ay) < 0.2) ay = 0;
        if (b(14)) ax = -1; if (b(15)) ax = 1; if (b(12)) ay = -1; if (b(13)) ay = 1;
        if (Math.abs(ax) > Math.abs(x)) x = ax; if (Math.abs(ay) > Math.abs(y)) y = ay;
        const now = { a: b(0), b: b(1), st: b(9), sp: b(2) || b(4), sn: b(3) || b(5) };
        ok = ok || (now.a && !p.prev.a); back = back || (now.b && !p.prev.b); start = start || (now.st && !p.prev.st);
        if (now.sp && !p.prev.sp) skin = -1; if (now.sn && !p.prev.sn) skin = 1;
        p.prev = now;
      }
    }
    return { x, y, ok, back, start, skin };
  }

  tileAt(x, y) { return this.tiles.find((t) => x >= t.x && x < t.x + TILE_W && y >= t.y && y < t.y + TILE_H); }
  cardAt(x, y) { return this.cards.find((c) => x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h); }

  update() {
    this.t++;
    const s = settings;
    let startPressed = false;
    for (const p of this.players) {
      if (p.kind === 'cpu') continue;
      const inp = this.readPlayer(p);
      p.x = Phaser.Math.Clamp(p.x + inp.x * 3.2, 4, VIEW_W - 4);
      p.y = Phaser.Math.Clamp(p.y + inp.y * 3.2, 26, VIEW_H - 8);
      if (p.slot === 0) {
        const mo = this.mouse;
        if (mo.moved) { p.x = mo.x; p.y = mo.y; mo.moved = false; }
        if (mo.left) { inp.ok = true; mo.left = false; }
        if (mo.right) { inp.back = true; mo.right = false; }
        if (mo.start) { inp.start = true; mo.start = false; }
      }
      if (inp.start) startPressed = true;
      if (inp.skin) {                                    // next / previous colour for this player's fighter
        const id = this.shownFighter(p);
        if (id && id !== 'random') { p.skin = stepSkin(id, p.skin, inp.skin); sfx('menu', 0.6, 1.1); }   // locked milestone costumes are skipped
      }
      if (inp.ok) {
        const tile = this.tileAt(p.x, p.y), card = this.cardAt(p.x, p.y);
        const sw = card && card.swatches.find((w) => p.x >= w.x - 1 && p.x < w.x + w.w + 1 && p.y >= w.y - 1 && p.y < w.y + w.h + 1);
        if (sw && sw.locked) sfx('curse', 0.4, 1.4);
        else if (sw) { card.p.skin = sw.i; sfx('menu', 0.6, 1.1); }
        else if (tile && tile.f.available) { p.pick = tile.f.id; sfx('select', 0.7); if (!voiceLine(this, tile.f.id, 'pick')) announce(this, tile.f.id); }
        else if (tile) sfx('curse', 0.4, 1.4);
        else if (card && card.p.kind === 'cpu') { s.cpuLevels[card.p.slot] = (s.cpuLevels[card.p.slot] + 1) % 3; sfx('menu', 0.6, 1.2); }
      }
      if (inp.back && p.pick) { p.pick = null; sfx('menu', 0.6, 0.8); }
    }
    const ready = this.players.every((p) => p.pick);
    if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) { sfx('menu', 0.6); this.scene.start('StageSelect'); return; }
    if (ready && startPressed) {
      s.picks = this.players.map((p) => p.pick);
      s.skins = this.players.map((p) => p.skin);
      sfx('go', 0.9);
      settings.from = 'Setup';                       // (after the match: back to here - ResultsScene / the pause menu's quit)
      this.scene.start('Match');
      return;
    }
    this.draw(ready);
  }

  // the fighter a player's card is showing: their pick, or the tile they're hovering
  shownFighter(p) {
    if (p.pick) return p.pick;
    const t = this.players.find((h) => h.kind !== 'cpu' && h.slot === p.slot) && this.tileAt(p.x, p.y);
    return t && t.f.available ? t.f.id : null;
  }

  draw(ready) {
    const s = settings;
    // the colours each card will really get (two players on the same fighter never share one)
    const shownIds = this.players.map((p) => { const id = this.shownFighter(p); return id && id !== 'random' ? id : '?' + p.slot; });
    const finalSkins = resolveSkins(shownIds, this.players.map((p) => p.skin));
    // hovered tiles get the hovering player's colour frame
    const hg = this.hoverG; hg.clear();
    for (const p of this.players) {
      if (p.kind === 'cpu') continue;
      const tile = this.tileAt(p.x, p.y);
      if (tile) {                                          // the hovering player's colour: a thick frame and corner brackets that pulse
        const c = PLAYER_COLORS[p.slot], o = 2 + Math.round(Math.sin(this.t * 0.2) * 1.5);
        hg.lineStyle(3, c, 1); hg.strokeRect(tile.x, tile.y, TILE_W, TILE_H);
        hg.fillStyle(c, 1);
        for (const [cx, cy, dx, dy] of [[tile.x - o, tile.y - o, 1, 1], [tile.x + TILE_W + o, tile.y - o, -1, 1], [tile.x - o, tile.y + TILE_H + o, 1, -1], [tile.x + TILE_W + o, tile.y + TILE_H + o, -1, -1]]) { hg.fillRect(Math.min(cx, cx + dx * 9), cy - (dy < 0 ? 2 : 0), 9, 2); hg.fillRect(cx - (dx < 0 ? 2 : 0), Math.min(cy, cy + dy * 9), 2, 9); }
      }
    }
    // cards
    for (const c of this.cards) {
      const p = c.p, col = PLAYER_COLORS[p.slot], g = c.bg;
      const hover = this.players.find((h) => h.kind !== 'cpu' && !h.pick && h.slot === p.slot && this.tileAt(h.x, h.y));
      const shown = p.pick || (hover && this.tileAt(hover.x, hover.y).f.available ? this.tileAt(hover.x, hover.y).f.id : null);
      g.clear();
      const cc = p.kind === 'cpu' ? 0x8a87a3 : col;
      g.fillStyle(0x000000, 0.6); g.fillRect(c.x + 5, c.y + 5, c.w, c.h);                      // hard shadow
      g.fillStyle(ARC.panel, 1); g.fillRect(c.x, c.y, c.w, c.h);
      g.fillStyle(col, p.kind === 'cpu' ? 0.1 : 0.18); g.fillRect(c.x, c.y + 24, c.w, c.h - 24);
      for (let k = 0; k < 6; k++) {                                                            // big slashes sliding behind the fighter
        const bx = ((k * 38 + this.t * (p.pick ? 1.2 : 0.4)) % (c.w + 60)) - 40;
        if (bx < c.w - 14) slant(g, c.x + Math.max(0, bx), c.y + 24, Math.min(14, c.w - Math.max(0, bx)), c.h - 54, col, 0.07, 40);
      }
      slant(g, c.x, c.y, c.w, 22, cc, 1, 8);                                                   // the header: the player's colour
      slant(g, c.x, c.y, c.w, 9, 0xffffff, 0.18, 4);
      slant(g, c.x + c.w - 60, c.y, 52, 22, shade(cc, 0.6), 1, 8);
      g.fillStyle(0x07060e, 1); g.fillRect(c.x, c.y + c.h - 30, c.w, 30);
      g.fillStyle(cc, 1); g.fillRect(c.x, c.y + c.h - 31, c.w, 2);
      if (p.pick) { g.lineStyle(3, col, 1); g.strokeRect(c.x, c.y, c.w, c.h); if (p.kind !== 'cpu') { g.fillStyle(col, 0.2 + 0.1 * Math.sin(this.t * 0.15)); g.fillRect(c.x, c.y + 24, c.w, c.h - 54); } }
      const hasFighter = shown && shown !== 'random';
      const fdef = hasFighter && ROSTER.find((r) => r.id === shown).def;
      c.sprite.setVisible(!!fdef).setAlpha(p.pick ? 1 : 0.55);
      if (fdef) showFighter(c.sprite, fdef, Math.floor((this.t + p.slot * 7) / 6) % 32, finalSkins[p.slot]);
      // colour swatches (click one to choose it)
      const sg = c.swatchG; sg.clear(); c.swatches = [];
      if (fdef) {
        // regular colours, then a small gap and the four milestone costumes (locked ones show a padlock)
        const list = skinsFor(shown), sw = 7, gap = 2, msGap = 5, nMs = list.filter((k) => k.milestone).length;
        const total = list.length * (sw + gap) - gap + (nMs ? msGap : 0);
        let x = Math.round(c.x + c.w / 2 - total / 2);
        const y = c.y + 29;
        list.forEach((k, i) => {
          if (k.milestone === 1) x += msGap;
          const on = i === finalSkins[p.slot], locked = !skinUnlocked(shown, i);
          if (k.milestone) { sg.fillStyle(locked ? 0x3a3360 : 0xf3c358, 1); sg.fillRect(x - 1, y + sw + 2, sw + 2, 1); }   // gold underline
          sg.fillStyle(on ? 0xffffff : 0x0b0a14, 1); sg.fillRect(x - 1, y - 1, sw + 2, sw + 2);
          if (locked) {
            sg.fillStyle(0x221d3a, 1); sg.fillRect(x, y, sw, sw);
            sg.fillStyle(0x8a87a3, 1); sg.fillRect(x + 2, y + 3, 3, 3); sg.fillRect(x + 2, y + 1, 1, 2); sg.fillRect(x + 4, y + 1, 1, 2); sg.fillRect(x + 3, y + 1, 1, 1);
          } else { sg.fillStyle(k.swatch, 1); sg.fillRect(x, y, sw, sw); }
          c.swatches.push({ x, y, w: sw, h: sw, i, locked });
          x += sw + gap;
        });
        // name of the chosen costume; pointing at a locked one shows what it takes to unlock it
        let label = skinInfo(shown, finalSkins[p.slot]).name;
        const pointer = p.kind !== 'cpu' ? p : null;
        const hov = pointer && c.swatches.find((w) => pointer.x >= w.x - 1 && pointer.x < w.x + w.w + 1 && pointer.y >= w.y - 1 && pointer.y < w.y + w.h + 1);
        if (hov) {
          const k = list[hov.i];
          label = hov.locked ? (k.shop ? 'LOCKED: BUY IT IN THE SHOP' : 'LOCKED: ' + MILESTONE_KOS[k.milestone] + ' KOS') : k.name;
        }
        c.skinName.setText(label).setColor(hov && hov.locked ? '#f3c358' : '#c9c4dc');
        c.kos.setText(getKOs(shown) + ' KOS');
      } else { c.skinName.setText(''); c.kos.setText(''); }
      c.unknown.setVisible(!hasFighter).setText(shown === 'random' ? '?' : '?');
      const f = ROSTER.find((r) => r.id === shown);
      c.name.setText(shown === 'random' ? 'RANDOM' : f ? f.name : '');
      let status;
      if (p.kind === 'cpu') status = 'CPU LV ' + DIFFICULTY[s.cpuLevels[p.slot]].name;
      else status = p.pick ? 'READY!' : 'CHOOSING...';
      c.status.setText(status).setColor(p.pick && p.kind !== 'cpu' ? PLAYER_CSS[p.slot] : '#c9c4dc');
    }
    // cursors: a pixel arrow with the player's tag
    const cg = this.cursorG; cg.clear();
    for (const p of this.players) {
      if (p.kind === 'cpu') continue;
      const x = Math.round(p.x), y = Math.round(p.y), col = PLAYER_COLORS[p.slot];
      cg.fillStyle(0x0b0a14, 1);
      for (let r = 0; r < 12; r++) cg.fillRect(x - 1, y - 1 + r, Math.min(r, 8) + 3, 1);
      cg.fillStyle(col, 1);
      for (let r = 0; r < 10; r++) cg.fillRect(x, y + r, Math.min(r, 7) + 1, 1);
      cg.fillStyle(0xffffff, 1); cg.fillRect(x + 1, y + 2, 1, 4);
      this.cursorTags[p.slot].setPosition(x + 8, y + 10);
    }
    // ready banner
    this.banner.clear(); this.bgFx.update(this.t);
    this.bannerText.setVisible(ready);
    if (ready) {                                           // READY: a slanted gold banner with black hazard stripes racing through
      const b = this.banner, y = CARD_Y - 19;
      slant(b, -20, y + 4, VIEW_W + 40, 26, 0x000000, 0.6, 10);
      slant(b, -20, y, VIEW_W + 40, 26, ARC.gold, 1, 10);
      for (let x = -40 + (this.t * 3) % 30; x < VIEW_W + 20; x += 30) slant(b, x, y, 12, 26, 0x07060e, 0.85, 14);
      slant(b, VIEW_W / 2 - this.bannerText.width / 2 - 20, y + 2, this.bannerText.width + 40, 22, ARC.sections.fight, 1, 10);
      this.bannerText.setScale(1 + 0.04 * Math.sin(this.t * 0.2));
    }
  }
}

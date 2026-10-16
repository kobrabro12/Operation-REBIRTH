// Fighter select: a grid of fighters on top, one card per player below, and a cursor for each
// human. Move your cursor onto a fighter and press attack to pick; press special to change your mind.
// Point at a CPU card and press attack to change that CPU's level.
import { VIEW_W, VIEW_H, FONT, PLAYER_COLORS, PLAYER_CSS, PLAYER_TINTS, DIFFICULTY } from '../config.js';
import { settings, MODE_NAMES } from '../settings.js';
import { ROSTER, GRID_SLOTS } from '../fighters/roster.js';
import { readPad } from '../input/controllers.js';
import { sfx } from '../audio/sfx.js';
import { makeButton } from '../ui/button.js';

const COLS = 6, TILE_W = 72, TILE_H = 50, GAP = 4;
const GRID_X = Math.round((VIEW_W - (COLS * TILE_W + (COLS - 1) * GAP)) / 2), GRID_Y = 30;
const CARD_Y = 148, CARD_H = 196, CARD_GAP = 8;

export class SelectScene extends Phaser.Scene {
  constructor() { super('Select'); }

  create() {
    this.t = 0;
    const s = settings;
    // portrait crop of Soul Summoner's idle frame (head and shoulders)
    const tex = this.textures.get('ss_idle');
    if (!tex.has('portrait')) tex.add('portrait', 0, 12, 4, 40, 36);

    // ---- who is playing
    this.players = [{ kind: 'kb', pad: s.p1Pad, label: 'P1', input: s.p1Pad !== null ? 'KEYBOARD + PAD ' + (s.p1Pad + 1) : 'KEYBOARD' }];
    s.extraPads.forEach((p) => this.players.push({ kind: 'pad', pad: p, label: 'P' + (this.players.length + 1), input: 'PAD ' + (p + 1) }));
    const humans = this.players.length;
    for (let i = 0; i < s.cpuCount && this.players.length < 4; i++) this.players.push({ kind: 'cpu', label: 'CPU' + (this.players.length + 1), input: 'CPU' });
    this.players.forEach((p, i) => {
      p.slot = i;
      p.pick = p.kind === 'cpu' ? 'random' : null;
      if (p.kind === 'cpu') s.cpuLevels[i] = s.cpuLevels[i] ?? s.difficulty;
      p.x = GRID_X + 30 + i * 40; p.y = GRID_Y + TILE_H + 20; p.prev = {};
    });

    // ---- static layout
    const g = this.add.graphics();
    g.fillStyle(0x0b0a14, 1); g.fillRect(0, 0, VIEW_W, VIEW_H);
    for (let y = 0; y < VIEW_H; y += 4) { g.fillStyle(0x131029, 1); g.fillRect(0, y, VIEW_W, 1); }
    g.fillStyle(0x1b1640, 1); g.fillRect(0, 0, VIEW_W, 22);
    g.fillStyle(0xf3c358, 1); g.fillRect(0, 22, VIEW_W, 2);
    this.add.text(10, 7, 'FIGHTER SELECT', { fontFamily: FONT, fontSize: '10px', color: '#f3c358' });
    this.add.text(VIEW_W - 10, 8, MODE_NAMES[s.mode], { fontFamily: FONT, fontSize: '8px', color: '#78a0c6' }).setOrigin(1, 0);

    // grid tiles
    this.tiles = [];
    for (let i = 0; i < GRID_SLOTS; i++) {
      const col = i % COLS, row = Math.floor(i / COLS);
      const x = GRID_X + col * (TILE_W + GAP), y = GRID_Y + row * (TILE_H + GAP);
      const isRandom = i === GRID_SLOTS - 1;
      const f = isRandom ? { id: 'random', name: 'RANDOM', available: true } : ROSTER[i] || { id: null, name: '???', available: false };
      this.tiles.push({ x, y, f });
      g.fillStyle(f.available ? 0x241d57 : 0x15122a, 1); g.fillRect(x, y, TILE_W, TILE_H);
      g.fillStyle(0x0b0a14, 1); g.fillRect(x, y + TILE_H - 12, TILE_W, 12);
      if (f.def) this.add.image(x + TILE_W / 2, y + 20, 'ss_idle', 'portrait').setScale(1);
      else if (isRandom) this.drawDie(g, x + TILE_W / 2, y + 19);
      else this.drawLocked(g, x + TILE_W / 2, y + 19, f.id === 'mr-wake');
      this.add.text(x + TILE_W / 2, y + TILE_H - 6, f.name, { fontFamily: FONT, fontSize: f.name.length > 10 ? '5px' : '6px', color: f.available ? '#ffffff' : '#4a4560' }).setOrigin(0.5);
      if (f.id === 'mr-wake') this.add.text(x + TILE_W - 3, y + 3, 'SOON', { fontFamily: FONT, fontSize: '5px', color: '#0b0a14', backgroundColor: '#f3c358', padding: { x: 2, y: 1 } }).setOrigin(1, 0);
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
      card.tag = this.add.text(x + 8, CARD_Y + 7, p.label, { fontFamily: FONT, fontSize: '10px', color: '#0b0a14' });
      card.input = this.add.text(x + cardW - 8, CARD_Y + 9, p.input, { fontFamily: FONT, fontSize: '6px', color: '#0b0a14' }).setOrigin(1, 0);
      card.name = this.add.text(x + cardW / 2, CARD_Y + 162, '', { fontFamily: FONT, fontSize: '8px', color: '#ffffff' }).setOrigin(0.5);
      card.status = this.add.text(x + cardW / 2, CARD_Y + 184, '', { fontFamily: FONT, fontSize: '7px', color: '#c9c4dc' }).setOrigin(0.5);
      return card;
    });

    this.cursorG = this.add.graphics().setDepth(20);
    this.cursorTags = this.players.map((p) => p.kind === 'cpu' ? null : this.add.text(0, 0, p.label, { fontFamily: FONT, fontSize: '6px', color: '#ffffff', backgroundColor: PLAYER_CSS[p.slot], padding: { x: 2, y: 1 } }).setDepth(21));

    this.banner = this.add.graphics().setDepth(30);
    this.bannerText = this.add.text(VIEW_W / 2, CARD_Y - 6, 'READY TO FIGHT!  CLICK HERE OR PRESS ENTER / START', { fontFamily: FONT, fontSize: '10px', color: '#0b0a14' }).setOrigin(0.5).setDepth(31);
    this.add.text(VIEW_W / 2, VIEW_H - 4, 'MOUSE OR MOVE CURSOR   CLICK / J / A PICK   RIGHT CLICK / K / B UNDO', { fontFamily: FONT, fontSize: '5px', color: '#8a87a3' }).setOrigin(0.5, 1);

    const K = Phaser.Input.Keyboard.KeyCodes;
    // mouse drives player 1's cursor: left click picks, right click undoes, click the yellow bar to start
    this.input.mouse.disableContextMenu();
    makeButton(this, 180, 5, '< BACK', () => { sfx('menu', 0.6); this.scene.start('StageSelect'); });
    this.mouse = { moved: false, left: false, right: false, x: 0, y: 0 };
    this.input.on('pointermove', (p) => { this.mouse.moved = true; this.mouse.x = p.x; this.mouse.y = p.y; });
    this.input.on('pointerdown', (p) => {
      this.mouse.x = p.x; this.mouse.y = p.y; this.mouse.moved = true;
      if (p.rightButtonDown()) this.mouse.right = true; else this.mouse.left = true;
    });
    this.bannerZone = this.add.zone(0, CARD_Y - 18, VIEW_W, 24).setOrigin(0).setInteractive({ useHandCursor: true }).setDepth(32);
    this.bannerZone.on('pointerdown', (p) => { if (p.leftButtonDown() && this.players.every((pl) => pl.pick)) this.mouse.start = true; });

    this.keys = this.input.keyboard.addKeys({ w: K.W, a: K.A, s: K.S, d: K.D, up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT, j: K.J, k: K.K, enter: K.ENTER, space: K.SPACE, esc: K.ESC }, false);
  }

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
    let x = 0, y = 0, ok = false, back = false, start = false;
    if (p.kind === 'kb') {
      x = (k.d.isDown || k.right.isDown ? 1 : 0) - (k.a.isDown || k.left.isDown ? 1 : 0);
      y = (k.s.isDown || k.down.isDown ? 1 : 0) - (k.w.isDown || k.up.isDown ? 1 : 0);
      ok = JD(k.j) || JD(k.space); back = JD(k.k); start = JD(k.enter);
    }
    if (p.pad !== null && p.pad !== undefined) {
      const pad = readPad(p.pad);
      if (pad) {
        const b = (n) => !!(pad.buttons[n] && pad.buttons[n].pressed);
        let ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
        if (Math.abs(ax) < 0.2) ax = 0; if (Math.abs(ay) < 0.2) ay = 0;
        if (b(14)) ax = -1; if (b(15)) ax = 1; if (b(12)) ay = -1; if (b(13)) ay = 1;
        if (Math.abs(ax) > Math.abs(x)) x = ax; if (Math.abs(ay) > Math.abs(y)) y = ay;
        const now = { a: b(0), b: b(1), st: b(9) };
        ok = ok || (now.a && !p.prev.a); back = back || (now.b && !p.prev.b); start = start || (now.st && !p.prev.st);
        p.prev = now;
      }
    }
    return { x, y, ok, back, start };
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
      if (inp.ok) {
        const tile = this.tileAt(p.x, p.y), card = this.cardAt(p.x, p.y);
        if (tile && tile.f.available) { p.pick = tile.f.id; sfx('select', 0.7); }
        else if (tile) sfx('curse', 0.4, 1.4);
        else if (card && card.p.kind === 'cpu') { s.cpuLevels[card.p.slot] = (s.cpuLevels[card.p.slot] + 1) % 3; sfx('menu', 0.6, 1.2); }
      }
      if (inp.back && p.pick) { p.pick = null; sfx('menu', 0.6, 0.8); }
    }
    const ready = this.players.every((p) => p.pick);
    if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) { sfx('menu', 0.6); this.scene.start('StageSelect'); return; }
    if (ready && startPressed) {
      s.picks = this.players.map((p) => p.pick);
      sfx('go', 0.9);
      this.scene.start('Match');
      return;
    }
    this.draw(ready);
  }

  draw(ready) {
    const s = settings;
    // hovered tiles get the hovering player's colour frame
    const hg = this.hoverG; hg.clear();
    for (const p of this.players) {
      if (p.kind === 'cpu') continue;
      const tile = this.tileAt(p.x, p.y);
      if (tile) { hg.lineStyle(2, PLAYER_COLORS[p.slot], 1); hg.strokeRect(tile.x + 1, tile.y + 1, TILE_W - 2, TILE_H - 2); }
    }
    // cards
    for (const c of this.cards) {
      const p = c.p, col = PLAYER_COLORS[p.slot], g = c.bg;
      const hover = this.players.find((h) => h.kind !== 'cpu' && !h.pick && h.slot === p.slot && this.tileAt(h.x, h.y));
      const shown = p.pick || (hover && this.tileAt(hover.x, hover.y).f.available ? this.tileAt(hover.x, hover.y).f.id : null);
      g.clear();
      g.fillStyle(0x161230, 1); g.fillRect(c.x, c.y, c.w, c.h);
      g.fillStyle(col, p.kind === 'cpu' ? 0.12 : 0.22); g.fillRect(c.x, c.y + 24, c.w, c.h - 24);
      // diagonal pixel stripes for texture
      g.fillStyle(col, 0.08);
      for (let k = -c.h; k < c.w; k += 14) for (let yy = 0; yy < c.h - 24; yy += 2) { const xx = k + yy; if (xx >= 0 && xx < c.w - 2) g.fillRect(c.x + xx, c.y + 24 + yy, 2, 2); }
      g.fillStyle(p.kind === 'cpu' ? 0x8a87a3 : col, 1); g.fillRect(c.x, c.y, c.w, 22);
      g.fillStyle(0x0b0a14, 1); g.fillRect(c.x, c.y + c.h - 30, c.w, 30);
      if (p.pick) { g.lineStyle(2, col, 1); g.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2); }
      const hasFighter = shown && shown !== 'random';
      c.sprite.setVisible(!!hasFighter).setFrame(Math.floor((this.t + p.slot * 7) / 6) % 32).setAlpha(p.pick ? 1 : 0.55);
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
    this.banner.clear();
    this.bannerText.setVisible(ready);
    if (ready) {
      const pulse = this.t % 40 < 20 ? 0xf3c358 : 0xffe08a;
      this.banner.fillStyle(0x0b0a14, 1); this.banner.fillRect(0, CARD_Y - 18, VIEW_W, 24);
      this.banner.fillStyle(pulse, 1); this.banner.fillRect(0, CARD_Y - 16, VIEW_W, 20);
    }
  }
}

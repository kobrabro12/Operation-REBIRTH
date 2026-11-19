// LOST: the shop's last tab (ShopScene sends you here). The TRUE SHOPKEEPER, HANZ / $@L - one man split down the middle
// (HANZ: his right half, pale grey - tired, sad, smart; $@L: his left half, blood red, a devil horn - sneaky, quick to
// anger, foolish) - leaning over his counter in a surreal dream of a room. Everything is pre-rendered 3D from Blender:
// tools/sprites/hanz_3d.py (the model), hanz_anim.py (his animations -> lostFrames.js + assets/shop/lost/hanz_<anim>.png),
// hanz_room.py (the room's three layers).
//
// Until you know his name the room is dark: type HANZ or $@L (keyboard, or the on-screen keypad - tap it / use a pad /
// touch) and the lights come on - saved for good (progress.js lostKeeper); the side you named greets you first.
// Then: his things float either side of him (LOST items in src/data/shop.js, paid in MEMORIES = the same coins); he
// turns to look at whatever you're on and his pupils follow it (the game draws them: lostFrames eyes); he talks in
// two colours, swinging his head round to whichever side is talking and arguing with himself (src/data/lostLines.js).
// The room breathes: its layers drift and ripple, grain crawls over it, and now and then the room skips. Things on his
// desk move on their own (lostFrames props: the lava lamp, the hourglass whose sand falls up, the candle), and when
// he's left alone he fidgets: a horrible twitch of the head, he takes out his clock-heart and checks the time, or he
// takes his face off (it's a mask - nothing behind it but two pinprick eyes) and puts it back. Everything is rendered
// PS1-style (320x180, wobbly vertices, 15-bit dithered colour) and drawn at 2x (LOST_FRAMES.scale).
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { MenuInput } from './menuInput.js';
import { sfx } from '../audio/sfx.js';
import { stopMusic } from '../audio/music.js';
import { makeButton } from '../ui/button.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { lostKeeper, setLostKeeper, getCoins, buyItem, owns, toggleEquip, isEquipped } from '../progress.js';
import { SHOP } from '../data/shop.js';
import { fighterById, showFighter } from '../fighters/roster.js';
import { skinsFor } from '../fighters/skins.js';
import { LOST_FRAMES } from './lostFrames.js';
import { LOST_LINES, LOST_COLORS, LOST_VOICE } from '../data/lostLines.js';

const DIR = 'assets/shop/lost/';
const TICKS = Math.round(60 / LOST_FRAMES.fps);        // game frames per animation frame
// the codes that let you in, and the keypad you can type them on without a keyboard (phones, pads, mouse)
const CODES = ['HANZ', '$@L'];
const GLYPHS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ$@', 'DEL'];
// the keypad: keys per row, key size, gap, top of the first row (big enough to hit with a thumb on a phone)
const PAD = { cols: 10, w: 40, h: 26, gap: 5, y: 236 };
// the room: how far its layers drift / ripple, the ripple's strips, grain strength, and how often it "skips" (frames)
const DREAM = { strip: 6, ripple: 1.6, rippleSpeed: 0.03, floatBob: 4, skyDrift: 2, grain: 0.05, skip: [900, 1800] };
// left alone he fidgets every so often (frames between, the chance it's the heart / the mask rather than the twitch)
const FIDGET = { every: [700, 1300], heart: 0.35, unmask: 0.3 };
// after a sale: the chance $@L cackles instead of rubbing his hands
const LAUGH = 0.4;
// his things: card size and where the two columns float
const CARD = { w: 104, h: 46, left: 12, right: 524, top: 70, gap: 54 };
// speech: typing speed (frames per letter), how long a finished line stays up, the bubble's width
const TALK = { per: 2, hold: 130, w: 470, y: 10 };
// how far his pupils can slide toward what he's watching (in texels of the face drawing)
const GAZE = { sal: [1.3, 0.7], hanz: [1.6, 1.4] };

/** The LOST room: HANZ / $@L behind his counter in the dream (see the top of this file). */
export class LostScene extends Phaser.Scene {
  constructor() { super('Lost'); }

  /** Loads the room, the counter, the desk things, his pupils and his animation sheets (only here - never at boot; the
   *  rarely-played ones - `lazy` - load in the background once the room is up: `loadLazy`). */
  preload() {
    for (const n of ['room_sky', 'room', 'room_float', 'room_dark', 'counter', 'pupils']) if (!this.textures.exists('lost_' + n)) this.load.image('lost_' + n, DIR + n + '.png');
    for (const n of Object.keys(LOST_FRAMES.props || {})) if (!this.textures.exists('lost_prop_' + n)) this.load.image('lost_prop_' + n, DIR + 'prop_' + n + '.png');
    for (const [a, spec] of Object.entries(LOST_FRAMES.anims)) if (!spec.lazy) this.queueAnim(a);
  }

  /** Queues an animation's sheets for loading (texture keys lost_hanz_<anim>_<k>). */
  queueAnim(a) {
    LOST_FRAMES.anims[a].sheets.forEach((f, k) => { if (!this.textures.exists(`lost_hanz_${a}_${k}`)) this.load.image(`lost_hanz_${a}_${k}`, DIR + f); });
  }

  /** Loads the lazy animations (the twitch, the clock-heart) after the room is up; they can play once they're in. */
  loadLazy() {
    this.ready = new Set(Object.keys(LOST_FRAMES.anims).filter((a) => !LOST_FRAMES.anims[a].lazy));
    const lazy = Object.keys(LOST_FRAMES.anims).filter((a) => LOST_FRAMES.anims[a].lazy);
    lazy.forEach((a) => this.queueAnim(a));
    this.load.once('complete', () => { if (!this.sys.isActive()) return; lazy.forEach((a) => { this.addAnimFrames(a); this.ready.add(a); }); });
    this.load.start();
  }

  /** Builds the room (dark or lit), him, his things and the speech bubble. `data.tab` = the shop tab to go back to. */
  create(data = {}) {
    this.back = data.tab || 0; this.t = 0; this.menu = new MenuInput(this);
    stopMusic();
    this.cameras.main.setBackgroundColor(0x000000);
    this.addFrames();
    this.lit = !!lostKeeper();
    // the room's layers
    this.sky = this.add.image(0, 0, 'lost_room_sky').setOrigin(0).setDepth(0);
    this.floatL = this.add.image(0, 0, 'lost_room_float').setOrigin(0).setDepth(1);
    this.strips = [];
    for (let y = 0; y < VIEW_H; y += DREAM.strip) this.strips.push(this.add.image(0, y, 'lost_room').setOrigin(0).setCrop(0, y, VIEW_W, DREAM.strip).setDepth(2));
    for (const s of this.strips) s.y = 0;
    this.dark = this.add.image(0, 0, 'lost_room_dark').setOrigin(0).setDepth(3);
    const S = LOST_FRAMES.scale || 1;                                            // (everything is rendered PS1-small and drawn at this size)
    this.counter = this.add.image(LOST_FRAMES.counter[0], LOST_FRAMES.counter[1], 'lost_counter').setOrigin(0).setDepth(5).setScale(S);
    this.props = Object.entries(LOST_FRAMES.props || {}).map(([n, p]) => ({ p, s: this.add.image(p.x, p.y, 'lost_prop_' + n, '0').setOrigin(0).setDepth(5.5).setScale(S) }));
    this.him = this.add.image(0, 0, 'lost_hanz_idle_0', '0').setOrigin(0).setDepth(6).setScale(S);
    this.pupils = { sal: this.add.image(0, 0, 'lost_pupils', 'sal').setDepth(7), hanz: this.add.image(0, 0, 'lost_pupils', 'hanz').setDepth(7) };
    this.fidgetAt = this.t + FIDGET.every[0];
    this.makeGrain();
    this.anim = { name: 'idle', f: 0, tick: 0, hold: false, rev: false, then: null };
    this.talk = null; this.lineQueue = [];
    this.skipAt = this.nextSkip();
    this.sel = 0; this.cards = [];
    this.ui = this.add.graphics().setDepth(20);
    this.bubbleG = this.add.graphics().setDepth(21); this.words = [];
    this.info = this.add.text(VIEW_W / 2, 322, '', { fontFamily: FONT, fontSize: '6px', color: '#e8e0d0', align: 'center', stroke: '#000000', strokeThickness: 3, wordWrap: { width: 420 } }).setOrigin(0.5, 0).setDepth(22);
    this.backBtn = makeButton(this, 8, 6, 'BACK', () => this.leave(), { size: '7px', depth: 23 });
    addFullscreenButton(this);
    this.idleAt = 600;
    if (this.lit) this.lightUp(false); else this.startDark();
    this.events.once('shutdown', () => this.cleanup());
    this.loadLazy();
  }

  /** Cuts each animation sheet into its frames (lostFrames.js says where), and the pupils sheet into 'sal' / 'hanz'. */
  addFrames() {
    for (const [a, spec] of Object.entries(LOST_FRAMES.anims)) if (!spec.lazy || this.textures.exists(`lost_hanz_${a}_0`)) this.addAnimFrames(a);
    const pt = this.textures.get('lost_pupils');
    if (!pt.has('sal')) for (const [n, m] of Object.entries(LOST_FRAMES.pupils)) pt.add(n, 0, m.x, 0, m.w, m.h);
    for (const [n, p] of Object.entries(LOST_FRAMES.props || {})) {
      const tex = this.textures.get('lost_prop_' + n);
      const cols = p.cols || p.n;
      if (!tex.has('0')) for (let i = 0; i < p.n; i++) tex.add(String(i), 0, (i % cols) * p.w, Math.floor(i / cols) * p.h, p.w, p.h);
    }
  }

  /** Cuts one animation's sheets into its frames: frame i lives on sheet k as frame name i. */
  addAnimFrames(a) {
    LOST_FRAMES.anims[a].frames.forEach((f, i) => {
      const tex = this.textures.get(`lost_hanz_${a}_${f.k}`);
      if (!tex.has(String(i))) tex.add(String(i), 0, f.sx, f.sy, f.w, f.h);
    });
  }

  /** A grain texture (dark specks on clear) laid over everything and jittered every few frames. */
  makeGrain() {
    if (!this.textures.exists('lost_grain')) {
      const W = 320, Hh = 180, c = this.textures.createCanvas('lost_grain', W, Hh), ctx = c.getContext();
      const img = ctx.createImageData(W, Hh);
      for (let i = 0; i < W * Hh; i++) { const v = Math.random(); if (v > 0.82) { img.data[i * 4 + 3] = 255; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v > 0.97 ? 255 : 0; } }
      ctx.putImageData(img, 0, 0); c.refresh();
    }
    this.grain = this.add.tileSprite(0, 0, VIEW_W, VIEW_H, 'lost_grain').setOrigin(0).setDepth(19).setAlpha(DREAM.grain);
  }

  // ------------------------------------------------------------------ the dark room and the code
  /** The lights are out: no him, a faint counter, and whatever you type hanging in the dark. */
  startDark() {
    this.dark.setVisible(true); this.him.setVisible(false); this.counter.setTint(0x141218); this.floatL.setVisible(false);
    for (const { s: sp } of this.props) sp.setTint(0x2a2230);                   // (the lava lamp and the candle still faintly glow)
    for (const p of Object.values(this.pupils)) p.setVisible(false);
    this.typed = ''; this.glyph = 0;
    this.typedText = this.add.text(VIEW_W / 2, 150, '', { fontFamily: FONT, fontSize: '22px', color: '#3a3644' }).setOrigin(0.5).setDepth(22);
    this.prompt = this.add.text(VIEW_W / 2, 196, '...', { fontFamily: FONT, fontSize: '7px', color: '#2c2834' }).setOrigin(0.5).setDepth(22);
    this.keys = GLYPHS.map((g, i) => this.keyRect(i));
    this.glyphText = GLYPHS.map((g, i) => this.add.text(this.keys[i].x + this.keys[i].w / 2, this.keys[i].y + PAD.h / 2, g, { fontFamily: FONT, fontSize: g === 'DEL' ? '7px' : '10px', color: '#4a4652' })
      .setOrigin(0.5).setDepth(22));
    this.input.keyboard.enabled = false; this.input.keyboard.disableGlobalCapture();   // (the game's keys step aside while you type)
    this.onKey = (e) => {
      if (e.key === 'Escape') { this.leave(); return; }
      if (e.key === 'Backspace') { this.typeGlyph('DEL'); e.preventDefault(); return; }
      if (e.key.length === 1 && /[a-zA-Z$@]/.test(e.key)) this.typeGlyph(e.key.toUpperCase());
    };
    window.addEventListener('keydown', this.onKey);
  }

  /** Where key i of the keypad sits: rows of PAD.cols centred on the screen; DEL is twice as wide. Returns {x, y, w}. */
  keyRect(i) {
    const row = Math.floor(i / PAD.cols), inRow = Math.min(PAD.cols, GLYPHS.length - row * PAD.cols);
    const wide = (k) => (GLYPHS[k] === 'DEL' ? 2 : 1), step = PAD.w + PAD.gap;
    let rowW = -PAD.gap; for (let k = row * PAD.cols; k < row * PAD.cols + inRow; k++) rowW += wide(k) * PAD.w + (wide(k) - 1) * PAD.gap + PAD.gap;
    let x = (VIEW_W - rowW) / 2; for (let k = row * PAD.cols; k < i; k++) x += wide(k) * step;
    return { x, y: PAD.y + row * (PAD.h + PAD.gap), w: wide(i) * PAD.w + (wide(i) - 1) * PAD.gap };
  }

  /** The keypad in the dark: faint keys, the picked one (pad / last tapped) lit, each pressed key flashing red. */
  drawKeys() {
    const g = this.ui;
    this.keys.forEach((k, i) => {
      const on = i === this.glyph, flash = this.keyFlash && this.keyFlash.i === i && this.t - this.keyFlash.t < 8;
      g.fillStyle(flash ? 0x5a1418 : 0x0e0c12, 0.9); g.fillRect(k.x, k.y, k.w, PAD.h);
      g.lineStyle(1, on ? 0x8a8692 : 0x2e2a36, 1); g.strokeRect(k.x + 0.5, k.y + 0.5, k.w - 1, PAD.h - 1);
      this.glyphText[i].setColor(flash ? '#ff4a4a' : on ? '#b8b4c0' : '#5a5662');
    });
  }

  /** One letter typed in the dark: the last letters are checked against HANZ / $@L; too many wrong ones crumble away. */
  typeGlyph(g) {
    if (this.lit) return;
    const ki = GLYPHS.indexOf(g); if (ki >= 0) this.keyFlash = { i: ki, t: this.t };
    if (g === 'DEL') this.typed = this.typed.slice(0, -1);
    else this.typed = (this.typed + g).slice(-6);
    sfx('menu', 0.25, 0.5 + Math.random() * 0.3);
    this.typedText.setText(this.typed).setColor(this.typed.length % 2 ? '#5a1418' : '#4a4854');
    const hit = CODES.find((c) => this.typed.endsWith(c));
    if (hit) { setLostKeeper(hit); this.lightUp(true, hit); return; }
    if (this.typed.length >= 6) { this.tweens.add({ targets: this.typedText, y: 220, alpha: 0, duration: 700, onComplete: () => { this.typed = ''; this.typedText.setText('').setY(150).setAlpha(1); } }); }
  }

  /** The lights come on. fresh = just unlocked (they flicker in and he greets you as the side you named). */
  lightUp(fresh, code) {
    this.lit = true;
    if (this.onKey) { window.removeEventListener('keydown', this.onKey); this.onKey = null; }
    try { this.input.keyboard.enabled = true; this.input.keyboard.enableGlobalCapture(); } catch (e) { /* plugin gone */ }
    for (const o of [this.typedText, this.prompt, ...(this.glyphText || [])]) if (o) o.destroy();
    this.typedText = this.prompt = null; this.glyphText = null; this.keys = null;
    this.counter.clearTint(); this.floatL.setVisible(true);
    for (const { s: sp } of this.props) sp.clearTint();
    this.makeCards();
    const who = code || lostKeeper();
    if (fresh) {
      // flicker: the dark layer blinks on and off a few times before the light holds
      this.him.setVisible(false); this.dark.setVisible(true);
      let n = 0;
      this.time.addEvent({ delay: 90, repeat: 9, callback: () => {
        n++; this.dark.setVisible(n % 2 === 0 && n < 9); this.him.setVisible(n > 4);
        sfx('menu', 0.2, 0.3 + n * 0.05);
        if (n === 10) { this.dark.setVisible(false); this.him.setVisible(true); this.play('greet', () => this.say(who === 'HANZ' ? 'greet_h' : 'greet_s')); }
      } });
    } else {
      this.dark.setVisible(false); this.him.setVisible(true);
      this.say('hello');
      if (!this.items().length) this.time.delayedCall(4200, () => this.say('empty'));
    }
  }

  // ------------------------------------------------------------------ his things
  /** His items: the LOST shelf in src/data/shop.js. */
  items() { const tb = SHOP.find((x) => x.lost); return tb ? tb.items : []; }

  /** Lays his things out as cards floating either side of him (first column left, then right). */
  makeCards() {
    this.cards.forEach((c) => { c.t.destroy(); if (c.spr) c.spr.destroy(); }); this.cards = [];
    this.items().forEach((it, i) => {
      const left = i < Math.ceil(this.items().length / 2), k = left ? i : i - Math.ceil(this.items().length / 2);
      const x = left ? CARD.left : CARD.right, y = CARD.top + k * CARD.gap;
      const fd = it.kind === 'costume' ? fighterById(it.fighter) : null, cos = !!(fd && fd.def);   // a costume card shows its fighter wearing it
      const t = this.add.text(cos ? x + 6 : x + CARD.w / 2, y + 8, it.name, { fontFamily: FONT, fontSize: '6px', color: '#f0e8d8', align: cos ? 'left' : 'center', wordWrap: { width: cos ? CARD.w - 50 : CARD.w - 10 } }).setOrigin(cos ? 0 : 0.5, 0).setDepth(22);
      const spr = cos ? this.add.sprite(0, 0, '__DEFAULT').setDepth(22) : null;
      this.cards.push({ it, x, y, t, left, spr, def: cos ? fd.def : null, skin: cos ? Math.max(0, skinsFor(fd.def.id).findIndex((k) => k.name === it.skin)) : 0 });
    });
  }

  /** The item picked now (null if his shelves are bare). */
  cur() { return this.cards[this.sel] ? this.cards[this.sel].it : null; }

  /** Buys / switches on the picked thing - and he reacts. */
  buy() {
    const it = this.cur(); if (!it || this.talkLock()) return;
    if (owns(it.id)) {
      if (it.kind === 'costume') { this.play('shrug'); this.say('owned'); return; }
      const on = toggleEquip(it.kind, it.id); this.say(on ? 'equip' : 'unequip'); return;
    }
    if (!buyItem(it.id, it.price)) { this.play('slam', null, true); this.say('broke'); sfx('menu', 0.5, 0.4); return; }
    if (it.kind !== 'costume') toggleEquip(it.kind, it.id);
    sfx('ding', 0.7, 0.8); this.play(Math.random() < LAUGH && this.ready && this.ready.has('laugh') ? 'laugh' : 'sold'); this.say('bought');
  }

  /** True while an important reaction is still on screen (so mashing BUY doesn't stack them up). */
  talkLock() { return this.talk && this.talk.lock && !this.talk.done; }

  // ------------------------------------------------------------------ talking
  /** Starts one of his lines (a random one under key in LOST_LINES): the pieces type out in his two colours. */
  say(key) {
    const set = LOST_LINES[key]; if (!set) return;
    const i = Math.floor(Math.random() * set.length), line = set[i], id = key + '_' + i;
    this.words.forEach((w) => w.destroy()); this.words = [];
    // lay the words out (wrapping), each in its speaker's colour, all hidden to start
    const words = []; for (const [who, txt] of line) for (const w of txt.split(/(?<= )/)) if (w) words.push({ who, w });
    let x = 0, y = 0; const lines = [[]];
    for (const wd of words) {
      const t = this.add.text(0, 0, wd.w, { fontFamily: FONT, fontSize: '8px', color: LOST_COLORS[wd.who], stroke: '#000000', strokeThickness: 3 }).setDepth(22);
      if (x + t.width > TALK.w && x > 0) { x = 0; y += 13; lines.push([]); }
      const tw = t.width;                                                       // (measured before it's blanked for typing)
      t.setPosition(x, y); t.full = wd.w; t.who = wd.who; t.setText(''); x += tw; lines[lines.length - 1].push(t); this.words.push(t);
    }
    // centre each row
    for (const row of lines) { const w = row.reduce((a, t) => a + this.measure(t.full), 0); let xx = (VIEW_W - w) / 2; for (const t of row) { t.x = xx; t.y += TALK.y + 8; xx += this.measure(t.full); } }
    this.talk = { key, id, i: 0, c: 0, tick: 0, done: false, hold: TALK.hold, rows: lines.length, who: line[0][0], switches: line.filter((p, k) => k && p[0] !== line[k - 1][0]).length, lock: ['bought', 'broke', 'owned'].includes(key) };
    if (LOST_VOICE[id] && this.cache.audio.exists('lost_' + id)) this.sound.play('lost_' + id);
    this.setTalkAnim(this.talk.who);
  }

  /** Width of a word as drawn (cached). */
  measure(w) { this.mcache = this.mcache || {}; if (this.mcache[w] == null) { const t = this.add.text(0, 0, w, { fontFamily: FONT, fontSize: '8px' }); this.mcache[w] = t.width; t.destroy(); } return this.mcache[w]; }

  /** Whoever's talking turns to you: HANZ's talk or $@L's - or he argues with himself if the line flips back and forth. */
  setTalkAnim(who) {
    if (['slam', 'sold', 'greet', 'shrug', 'heart', 'twitch', 'unmask', 'laugh'].includes(this.anim.name) && !this.anim.done) { this.anim.then = () => this.setTalkAnim(this.talk && !this.talk.done ? this.talk.who : null); return; }
    if (!who) { this.play('idle'); return; }
    const name = this.talk && this.talk.switches >= 2 ? 'argue' : who === 'h' ? 'hanz_talk' : 'sal_talk';
    if (this.anim.name !== name) this.play(name);
  }

  /** Types the current line out a letter at a time; when it's done it stays up a while, then he goes quiet. */
  stepTalk() {
    const T = this.talk; if (!T) return;
    if (!T.done) {
      if (++T.tick < TALK.per) return; T.tick = 0;
      const w = this.words[T.i]; if (!w) { T.done = true; return; }
      if (w.who !== T.who) { T.who = w.who; this.setTalkAnim(T.who); }
      w.setText(w.full.slice(0, ++T.c));
      if (T.c % 2 && w.full[T.c - 1] !== ' ') sfx('menu', 0.06, T.who === 'h' ? 0.55 : 1.4);
      if (T.c >= w.full.length) { T.i++; T.c = 0; }
    } else if (--T.hold <= 0) {
      this.words.forEach((w) => w.destroy()); this.words = []; this.talk = null; this.setTalkAnim(null);
    }
  }

  // ------------------------------------------------------------------ his animations
  /** Plays one of his animations; then = called when a one-shot finishes; force = even over another one-shot. */
  play(name, then = null, force = false) {
    if (!LOST_FRAMES.anims[name] || (this.ready && !this.ready.has(name))) return;
    if (!force && this.anim.name === name && !this.anim.done) return;
    this.anim = { name, f: 0, tick: 0, done: false, then, rev: false };
  }

  /** Advances his animation, then puts the right frame up and moves his pupils. */
  stepAnim() {
    const A = this.anim, spec = LOST_FRAMES.anims[A.name], n = spec.frames.length;
    if (++A.tick >= TICKS) {
      A.tick = 0;
      if (A.rev) { if (A.f > 0) A.f--; else { A.done = true; this.play('idle'); } }
      else if (A.f < n - 1) A.f++;
      else if (spec.loop) A.f = 0;
      else if (!A.done) { A.done = true; const then = A.then; A.then = null; if (then) then(); else if (!A.name.startsWith('look')) this.play('idle'); }
    }
    const cur = LOST_FRAMES.anims[this.anim.name], fr = cur.frames[Math.min(this.anim.f, cur.frames.length - 1)];
    this.him.setTexture(`lost_hanz_${this.anim.name}_${fr.k}`, String(Math.min(this.anim.f, cur.frames.length - 1))).setPosition(fr.x, fr.y);
    this.eyes(fr);
  }

  /** His pupils: drawn at each eye (from the frame's export), slid toward what he's watching, hidden when that eye
   *  faces away. */
  eyes(fr) {
    const target = this.gazeTarget();
    for (const [n, p] of Object.entries(this.pupils)) {
      const e = fr.eyes[n];
      if (!this.him.visible || !e || e[3] < 0.3) { p.setVisible(false); continue; }
      const dx = target.x - e[0], dy = target.y - e[1], d = Math.hypot(dx, dy) || 1, [gx, gy] = GAZE[n];
      const k = Math.min(1, d / 120);
      p.setVisible(true).setScale(e[2] / (LOST_FRAMES.pupilK || 1)).setPosition(Math.round(e[0] + dx / d * gx * k * e[2]), Math.round(e[1] + dy / d * gy * k * e[2]));
    }
  }

  /** What he's looking at: the thing you're on, else the pointer if it's moving, else you (the middle of the screen). */
  gazeTarget() {
    const c = this.cards[this.sel];
    if (c && this.lit) return { x: c.x + CARD.w / 2, y: c.y + CARD.h / 2 + this.bob(c) };
    const p = this.input.activePointer;
    if (p && this.t - (this.pointerT || -999) < 120) return { x: p.x, y: p.y };
    return { x: VIEW_W / 2, y: 120 };
  }

  /** Left alone (no talking, just idling) he fidgets now and then: a horrible twitch of the head, his clock-heart (out of
   *  his chest, checks the time, back), or THE MASK (takes his face off, shows you nothing, puts it back) - the last two
   *  followed by a line about it. */
  fidget() {
    if (this.talk || this.anim.name !== 'idle' || this.t < this.fidgetAt) return;
    const [a, b] = FIDGET.every; this.fidgetAt = this.t + a + Math.floor(Math.random() * (b - a));
    const r = Math.random(), has = (a) => this.ready && this.ready.has(a);
    const pick = r < FIDGET.heart && has('heart') ? 'heart' : r < FIDGET.heart + FIDGET.unmask && has('unmask') ? 'unmask' : 'twitch';
    this.play(pick, pick === 'twitch' ? null : () => this.say(pick));        // (the heart and the mask get a line after)
  }

  /** Turns him toward the picked thing (look_l / look_r) when he isn't busy talking or reacting. */
  lookAtPick() {
    if (this.talk || !['idle', 'look_l', 'look_r'].includes(this.anim.name)) return;
    const c = this.cards[this.sel]; const want = !c ? 'idle' : c.left ? 'look_l' : 'look_r';
    if (want === this.anim.name) return;
    if (want === 'idle' && this.anim.name.startsWith('look')) { this.anim.rev = true; return; }
    this.play(want);
  }

  // ------------------------------------------------------------------ the dream
  /** The room breathes: sky drifts, floating things bob, the room ripples in strips, grain crawls, and now and then
   *  everything skips - the lights blink out, or the room jolts sideways and he stops dead. */
  dream() {
    const t = this.t;
    this.sky.y = Math.sin(t * 0.004) * DREAM.skyDrift;
    this.floatL.setPosition(Math.sin(t * 0.006) * 6, Math.sin(t * 0.011) * DREAM.floatBob);
    this.strips.forEach((s, i) => { s.x = Math.sin(i * 0.45 + t * DREAM.rippleSpeed) * DREAM.ripple; });
    if (t % 3 === 0) this.grain.setTilePosition(Math.floor(Math.random() * 320), Math.floor(Math.random() * 180));
    for (const { p, s } of this.props) s.setFrame(String(Math.floor(t * p.fps / 60) % p.n));   // the desk things loop at their own pace
    if (this.lit && t >= this.skipAt) {
      this.skipAt = t + this.nextSkip();
      if (Math.random() < 0.5) { this.dark.setVisible(true); this.time.delayedCall(70, () => this.dark.setVisible(false)); }
      else { this.cameras.main.setScroll(Math.random() < 0.5 ? -26 : 26, 0); this.frozen = 24; this.time.delayedCall(80, () => this.cameras.main.setScroll(0, 0)); }   // the room jolts sideways and he stops dead for a moment
    }
  }

  /** Frames until the next skip. */
  nextSkip() { return DREAM.skip[0] + Math.floor(Math.random() * (DREAM.skip[1] - DREAM.skip[0])); }

  /** How far a card bobs this frame. */
  bob(c) { return Math.round(Math.sin(this.t * 0.02 + c.y * 0.1) * 2); }

  /** Draws his floating cards and the picked one's details (name, info, price in MEMORIES, BUY). */
  drawUI() {
    const g = this.ui; g.clear();
    if (!this.lit) { if (this.keys && this.glyphText) this.drawKeys(); return; }
    this.cards.forEach((c, i) => {
      const on = i === this.sel, y = c.y + this.bob(c), own = owns(c.it.id);
      g.fillStyle(0x000000, 0.45); g.fillRect(c.x + 3, y + 3, CARD.w, CARD.h);
      g.fillStyle(on ? 0x2a1418 : 0x16141c, 0.92); g.fillRect(c.x, y, CARD.w, CARD.h);
      g.lineStyle(1, on ? 0xff4a4a : 0x6a6670, 1); g.strokeRect(c.x + 0.5, y + 0.5, CARD.w - 1, CARD.h - 1);
      if (on) { g.lineStyle(1, 0xdedcd8, 0.7); g.strokeRect(c.x - 2.5, y - 2.5, CARD.w + 4, CARD.h + 4); }
      c.t.setY(y + 8);
      if (c.spr) {                                                                     // the fighter, idling, in the card's right end
        showFighter(c.spr, c.def, Math.floor((this.t + i * 7) / 6), c.skin);
        c.spr.setScale(Math.min(1, 40 / c.spr.frame.realHeight, 44 / c.spr.frame.realWidth * 1.4)).setPosition(c.x + CARD.w - 24, y + CARD.h - 3);
      }
      g.fillStyle(own ? 0x6a6670 : 0xff4a4a, 1); g.fillRect(c.x + 8, y + CARD.h - 11, 4, 4);
    });
    const it = this.cur();
    g.fillStyle(0x000000, 0.7); g.fillRect(0, VIEW_H - 46, VIEW_W, 46);
    g.fillStyle(0xff4a4a, 1); g.fillRect(0, VIEW_H - 46, VIEW_W / 2, 1); g.fillStyle(0xdedcd8, 1); g.fillRect(VIEW_W / 2, VIEW_H - 46, VIEW_W / 2, 1);
    if (it) {
      const own = owns(it.id), state = own ? (it.kind === 'costume' ? 'YOURS' : isEquipped(it.kind, it.id) ? 'ON  (J: SWITCH OFF)' : 'OFF  (J: SWITCH ON)') : it.price + ' MEMORIES  (J: BUY)';
      this.info.setText(it.name + '  -  ' + state + '\n' + (it.info || ''));
    } else this.info.setText('YOU HAVE ' + getCoins() + ' MEMORIES');
  }

  // ------------------------------------------------------------------ the loop
  /** Each frame: input, the dream, his animation and eyes, his talking, the cards. */
  update() {
    this.t++;
    const m = this.menu.poll();
    const p = this.input.activePointer;
    if (p && (p.x !== this.px || p.y !== this.py)) { this.px = p.x; this.py = p.y; this.pointerT = this.t; }
    if (m.back || m.pads.some((q) => q.button === 'b')) { this.leave(); return; }
    if (!this.lit) {
      const n = GLYPHS.length;
      if (m.left) this.glyph = (this.glyph + n - 1) % n;
      if (m.right) this.glyph = (this.glyph + 1) % n;
      if (m.up) this.glyph = Math.max(0, this.glyph - PAD.cols);
      if (m.down) this.glyph = Math.min(n - 1, this.glyph + PAD.cols);
      if (m.pads.some((q) => q.button === 'a')) this.typeGlyph(GLYPHS[this.glyph]);
      if (this.prompt) this.prompt.setAlpha(0.4 + 0.6 * Math.abs(Math.sin(this.t * 0.02)));
    } else {
      const n = this.cards.length;
      if (n) {
        const half = Math.ceil(n / 2);
        if (m.up) this.sel = (this.sel + n - 1) % n;
        if (m.down) this.sel = (this.sel + 1) % n;
        if (m.left || m.right) this.sel = this.sel < half ? Math.min(n - 1, this.sel + half) : this.sel - half;
        if (m.up || m.down || m.left || m.right) { sfx('menu', 0.3, 1.1); if (Math.random() < 0.3 && !this.talk) this.say('look'); }
        if (m.ok || m.pads.some((q) => q.button === 'a')) this.buy();
      }
      this.lookAtPick();
      if (!this.talk && --this.idleAt <= 0) { this.idleAt = 600 + Math.floor(Math.random() * 600); this.say('idle'); }
      this.fidget();
      this.stepTalk();
    }
    this.dream();
    if (this.frozen > 0) this.frozen--; else this.stepAnim();
    this.drawUI();
  }

  /** Clicking / tapping: in the dark, a key of the keypad; lit, a card picks it (again = buy), and tapping him pokes him. */
  pointerDown(p) {
    if (!this.lit) {                                                                   // a key of the keypad (the gaps count as the nearest key)
      const k = (this.keys || []).findIndex((r) => p.x >= r.x - 3 && p.x <= r.x + r.w + 3 && p.y >= r.y - 3 && p.y <= r.y + PAD.h + 3);
      if (k >= 0) { this.glyph = k; this.typeGlyph(GLYPHS[k]); }
      return;
    }
    for (let i = 0; i < this.cards.length; i++) {
      const c = this.cards[i], y = c.y + this.bob(c);
      if (p.x >= c.x && p.x <= c.x + CARD.w && p.y >= y && p.y <= y + CARD.h) { if (this.sel === i) this.buy(); else { this.sel = i; sfx('menu', 0.3, 1.1); } return; }
    }
    if (this.him.getBounds().contains(p.x, p.y) && !this.talkLock()) {
      this.say('poke');
      if (!['heart', 'twitch', 'unmask'].includes(this.anim.name) || this.anim.done) this.play(Math.random() < 0.5 ? 'slam' : 'shrug', null, true);   // (not while his heart's out)
    }
  }

  /** Back to the shop (he says goodbye if the lights are on). */
  leave() {
    if (this.leaving) return; this.leaving = true;
    if (this.lit) { this.say('bye'); this.time.delayedCall(900, () => this.scene.start('Shop', { tab: this.back })); }
    else this.scene.start('Shop', { tab: this.back });
  }

  /** Puts the keyboard back and drops the typing listener. */
  cleanup() {
    if (this.onKey) window.removeEventListener('keydown', this.onKey);
    try { this.input.keyboard.enabled = true; this.input.keyboard.enableGlobalCapture(); } catch (e) { /* plugin gone */ }
  }

  /** (Phaser calls this once the scene is up.) */
  init() { this.input.on('pointerdown', (p) => this.pointerDown(p)); }
}

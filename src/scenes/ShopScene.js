// The Shop (TRINKETS > SHOP). Tabs of shelves along the top, a grid of item cards, and on the right the SHOPKEEPER -
// an old TV sitting on his desk, with Mason's faces on the screen (calm / happy / money / shock / smug, picked by what
// you do: KEEPER in src/data/shop.js) and a speech bubble - over a panel with the picked item's name, description and
// the BUY button. What's for sale lives in src/data/shop.js; coins, what you own and what's switched on live in
// src/progress.js. Buying a stage effect, track or extra switches it on; press the button again to switch it off
// (or back on). Costumes are picked on the select screen once bought. Picking a track plays a preview.
// PREVIEW (P, or the button next to BUY on a costume): the fighter wearing it, big, playing its moves (openPreview).
// GAMBLING: capsule machines stocked from the other shelves (data/shop.js gachaPool) - SPIN charges the price, then
// the machine plays out each pull (the `spin` overlay): crank, capsule, the prize. Duplicates pay back some coins.
// A/D or arrows move along a shelf (W/S: up and down a row), Q/E (or a pad's X/Y) switch tabs,
// J / Enter / A buys, K / Esc / B goes back. Mouse: click a tab or a card, BUY.
// SECRETS: ring the bell on his desk 3 times and his screen asks for a code (SECRETS below). A secret keeps playing
// while you carry on shopping; click his screen (or leave the shop) to switch it off.
//   STILLLIFE  the shop phases into the Backrooms, he becomes a 90s antenna TV playing Mason's Still Life video
//   RTD        (REMEMBER THAT DAY) Rosemary screams on his screen and the whole shop turns into a VHS tape
//   NOLI       until you leave the shop: his face becomes Mason's NOLI drawing, he talks in glitchy bits of the NOLI
//              video, everything he says comes out scrambled, a purple haze hangs over the shop, his hidden items appear,
//              and the first 5 seconds of the NOLI clip play every time it's typed
//   RIPHOOD    until you leave the shop: Mason's pixelated_audio 15 plays, the whole shop turns into a WW2 supply depot
//              (look 'ww2': a canvas tent, sandbags, a swinging lamp, khaki shelves, a distant rumble now and then), he
//              becomes an olive-drab field set with a helmet on top and talks like a radio operator (KEEPER.riphood),
//              and the RIPHOOD items appear - one on every shelf (shop.js hidden: 'riphood')
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { playMusic, stopMusic } from '../audio/music.js';
import { settings } from '../settings.js';
import { MenuInput } from './menuInput.js';
import { sfx } from '../audio/sfx.js';
import { makeButton } from '../ui/button.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { SHOP, CURRENCY, KEEPER, GACHA_REFUND, gachaPool, shelfItems } from '../data/shop.js';
import { getCoins, addCoins, buyItem, grantItem, owns, toggleEquip, isEquipped, reveal, unreveal } from '../progress.js';
import { fighterById, showFighter } from '../fighters/roster.js';
import { skinsFor, skinSheets } from '../fighters/skins.js';
import { stat, addSecret, checkAchievements, isUnlocked } from '../achievements.js';
import { achievementToasts } from '../ui/toast.js';
import { ArcadeBg, titleBanner, hintBar, panel, slant, ARC, shade } from '../ui/arcade.js';

const ACC = ARC.sections.shop;

const W = VIEW_W, H = VIEW_H;
const C = { bg: 0x0b0a14, panel: 0x2a1640, panel2: 0x1c0f2c, line: 0xc77dff, gold: 0xf3c358, dim: 0x5a4a70 };
const GRID = { x: 16, y: 84, cols: 4, rows: 2, w: 94, h: 108, gap: 6 };   // the item cards
const SIDE = { x: 424, y: 210, w: 200, h: 102 };                          // the details panel, under the shopkeeper's counter
const KP = { x: 524, y: 126 };                                            // the middle of the shopkeeper's TV (on his desk)
const TAB = { x: 16, y: 56, w: 77, h: 20, gap: 4 };
const PER = GRID.cols * GRID.rows;
// the bell on his desk (click it): 3 rings within BELL.window frames opens the code screen
const BELL = { x: KP.x + 58, y: 168, r: 11, rings: 3, window: 120 };
// the on-screen keypad for typing a code (over the shelves): 8 x 4 keys
const KEYPAD = { x: 30, y: 104, w: 42, h: 30, gap: 5, cols: 8, keys: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 'DEL', 'OK', 'CANCEL'] };
const KEY_ROWS = Math.ceil(KEYPAD.keys.length / KEYPAD.cols);   // (5 rows: the letters, the digits, then DEL / OK / CANCEL)
// secret codes typed on his screen, and what they play: a video drawn on his screen at `px` x `px` pixels, scaled up
//   video  a clip drawn on his screen at `px` pixels square (webm first; mp4 for Safari) - plays once
//   anim   a spritesheet looped on his screen (`fps`), with `audio` looping under it
//   look   'backrooms' (sepia, wallpaper, buzzing lights, the 90s TV) or 'vhs' (washed-out tape, tracking, OSD)
const SECRETS = {
  STILLLIFE: { video: ['assets/shop/still_life.webm', 'assets/shop/still_life.mp4'], px: 34, line: 'stilllife', look: 'backrooms', tv: '90s' },
  RTD: { anim: 'shop_rtd', px: 68, fps: 8, audio: ['assets/shop/rtd.ogg', 'assets/shop/rtd.mp3'], scream: 6, line: 'rtd', look: 'vhs' },
  // forever (saved: the code is in the player's found secrets): nothing plays on his screen - he IS it now. `clip` plays once.
  NOLI: { takeover: true, clip: ['assets/shop/noli.ogg', 'assets/shop/noli.mp3'], line: 'noli', look: 'noli' },
  // until you leave: the WW2 shop. `music` loops in place of the shop's own music
  RIPHOOD: { takeover: 'riphood', line: 'riphood' },
  // until you leave: the Soviet shop (TAKEOVERS.soviet). Typing it also earns OUR VICTORY (achievements.js)
  PAPERSPLEASE: { takeover: 'soviet', line: 'soviet' },
  // the house number: unlocks 13 WILLOW LANE (stages.js `secret: '13'` - found codes are saved). His screen goes dark, the
  // phone rings, a cracked doll's face looks out of it for a moment (`call`)
  13: { call: true, stage: '13 WILLOW LANE', line: 'thirteen' },
};
// RIPHOOD: the shop's colours while it's a supply depot (khaki trim, olive shelves), his screen's amber glow, and how
// often the far-off guns shake the tent (frames, random between)
const WW2 = { acc: 0xc8b466, pal: { card: 0x3a3a22, cardIn: 0x24241a, cardOn: 0x3e3e24, tabOff: 0x2e2e1c, plate: 0x16160e, window: 0x12120a },
  amber: 0xffc070, rumble: [480, 900] };
// PAPERSPLEASE: the shop's colours while it's the PEOPLE'S STORE (gold trim, deep red shelves), how fast the snow
// falls past, and where his radio sits on the desk (left of the TV) and its little flag
const USSR = { acc: 0xffc83a, pal: { card: 0x4a1418, cardIn: 0x2a0a0e, cardOn: 0x5a181c, tabOff: 0x3a1014, plate: 0x1a0608, window: 0x140406 },
  snow: 0.5, radio: { dx: -58, w: 30, h: 20 } };
// codes that turn the whole shop into something else until you leave (SECRETS with `takeover`): the title on the plate,
// the music, the look (setLook), the shelves' colours, the hidden items they reveal (shop.js `hidden`), his lines
// (KEEPER[lines]), what the money is called, and what he says when it starts
const TAKEOVERS = {
  riphood: { tag: 'riphood', title: 'SUPPLY DEPOT', music: 'bgm_shop_riphood', look: 'ww2', acc: WW2.acc, pal: WW2.pal, lines: 'riphood', face: 'smug',
    say: ['NEW SUPPLIES ON EVERY SHELF. LOOK FOR THE KHAKI ONES.', '#d8c88a'] },
  soviet: { tag: 'papers', title: "PEOPLE'S STORE", music: 'bgm_shop_soviet', look: 'soviet', acc: USSR.acc, pal: USSR.pal, lines: 'soviet', face: 'happy',
    currency: 'RUBLES', say: ['ALL PRICES NOW IN RUBLES. NEW GOODS ON THE SHELVES, COMRADE.', '#ffd25a'] },
};
// PAPERSPLEASE: the other countries' things on his shelf, clickable - [x, y, w, h, his line (KEEPER.soviet)]
const EGGS = [[432, 100, 16, 18, 'tea'], [450, 102, 22, 16, 'beret'], [574, 100, 18, 18, 'jazz'], [593, 100, 14, 18, 'panda'], [606, 108, 16, 10, 'pierogi']];
const PAL = { card: 0x2c2650, cardIn: ARC.panel, cardOn: 0x2a2048, tabOff: 0x241e3e, plate: 0x0d0b1a, window: 0x0d0a18 };
// NOLI: how glitched his lines come out - chance per letter of a junk character / a stutter, how often the shown line
// re-scrambles while it's up (frames), his face's tint, and the haze's colour + strength
const NOLI = { junk: 0.07, stutter: 0.05, rescramble: 9, junkChars: '#%?/_<>*0!', tint: 0xd8a8ff, haze: 0x7a2ad8, hazeA: 0.14 };
// NOLI's voice: glitchy bits of Mason's NOLI video, cut and broken up further by tools/audio/noli_voice.py (files
// public/assets/shop/noli_voice/<mood>_<n>). Each mood is a pool of clips from different parts of the video; he plays a
// random one from the pool that fits his line (KEEPER.lines key -> mood). greet = the most voice-like bits; blip = tiny
// crushed bursts (things that happen a lot); tic = a phrase whose last syllable sticks; crunch = the noisiest bits crushed
// to pieces; snap = cut off into static; loop = stuck in a stutter that climbs; dive = reversed, then the tape stops;
// chop = shuffled, gated babble
export const NOLI_MOODS = { greet: 3, blip: 5, tic: 3, crunch: 4, snap: 3, loop: 3, dive: 3, chop: 3 };
const NOLI_VOICE = { hello: 'greet', tab: 'blip', look: 'blip', owned: 'tic', preview: 'blip', bought: 'tic', equip: 'tic',
  jackpot: 'chop', gamble: 'chop', broke: 'crunch', spin: 'crunch', empty: 'crunch', poke: 'crunch', wrongcode: 'snap',
  soldout: 'dive', unequip: 'dive', off: 'dive', dud: 'dive', quiet: 'dive', secret: 'loop', noli: 'loop' };
// and every so often (frames, random between) he mutters something on his own
const NOLI_MUTTER = [300, 620];
// a line as NOLI says it: letters swapped for junk, stuttered words, now and then a trailing-off
function glitchLine(s) {
  let o = '';
  for (const w of s.split(' ')) {
    let x = '';
    if (w.length > 2 && Math.random() < NOLI.stutter * 3) x += w[0] + '-';
    for (const ch of w) { if (/[A-Z]/.test(ch) && Math.random() < NOLI.junk) x += NOLI.junkChars[Math.floor(Math.random() * NOLI.junkChars.length)]; else x += ch; if (/[A-Z]/.test(ch) && Math.random() < NOLI.stutter) x += ch; }
    o += (o ? ' ' : '') + x;
  }
  return Math.random() < 0.2 ? o + '...' : o;
}
const PAGE = { x: 362, y: 46 };                                           // PAGE 1/2 and its arrows, over the cards' top right
const BTN = { y: SIDE.y + SIDE.h - 34, h: 28, prevW: 56 };                 // the panel's buttons (PREVIEW sits left of BUY on a costume)
// the moves a costume preview plays, in this order (whichever the fighter has)
const SHOW = [['jab', 'JAB'], ['ftilt', 'FORWARD TILT'], ['fsmash', 'FORWARD SMASH'], ['usmash', 'UP SMASH'], ['nair', 'NEUTRAL AIR'], ['fair', 'FORWARD AIR'],
  ['neutralB', 'NEUTRAL SPECIAL'], ['sideB', 'SIDE SPECIAL'], ['upb', 'UP SPECIAL'], ['downB', 'DOWN SPECIAL'], ['taunt', 'TAUNT']];

export class ShopScene extends Phaser.Scene {
  constructor() { super('Shop'); }

  create() {
    this.noli = false; unreveal('noli');              // NOLI lasts one visit: you come back to the normal shop
    this.riphood = this.soviet = false; this.mode = null; unreveal('riphood'); unreveal('papers');   // ...and so do RIPHOOD and PAPERSPLEASE
    this.call = 0;
    this.acc = ACC; this.pal = PAL; this.banner2 = null;
    this.t = 0; this.tab = 0; this.sel = 0; this.page = 0; this.menu = new MenuInput(this); this.clicked = null;
    this.qKey = this.input.keyboard.addKey('Q'); this.eKey = this.input.keyboard.addKey('E'); this.pKey = this.input.keyboard.addKey('P');
    playMusic(this, 'bgm_title');
    this.bgFx = new ArcadeBg(this, ACC, { second: ARC.sections.trinkets });
    this.bg = this.add.graphics();
    this.g = this.add.graphics();                    // redrawn every frame: tabs, cards, the cursor, the panel
    const txt = (x, y, s, size, color, o = {}) => this.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', color, ...o });
    this.banner = titleBanner(this, 'SHOP', ACC, { crumb: 'TRINKETS  >  SHOP' });
    this.tabT = SHOP.map((tb, i) => txt(TAB.x + i * (TAB.w + TAB.gap) + TAB.w / 2, TAB.y + 6, tb.name, 7, '#c9c4dc', { stroke: '#07060e', strokeThickness: 3 }).setOrigin(0.5, 0));
    this.coinT = txt(W - 14, 34, '', 8, '#f3c358', { stroke: '#0b0a14', strokeThickness: 3 }).setOrigin(1, 0.5);
    this.cardName = []; this.cardPrice = []; this.cardSpr = [];
    this.pageT = this.add.text(PAGE.x, PAGE.y, '', { fontFamily: FONT, fontSize: '6px', color: '#f3c358' }).setOrigin(0.5).setVisible(false);
    for (let i = 0; i < PER; i++) {
      const [x, y] = this.cardAt(i);
      this.cardName.push(txt(x + GRID.w / 2, y + 70, '', 6, '#e8e4f4', { align: 'center' }).setOrigin(0.5, 0));
      this.cardPrice.push(txt(x + GRID.w / 2, y + 88, '', 6, '#f3c358').setOrigin(0.5, 0));
      this.cardSpr.push(this.add.sprite(x + GRID.w / 2, y + 62, 'ss_idle', 0).setVisible(false));   // a costume, worn by its fighter
    }
    this.nameT = txt(SIDE.x + 12, SIDE.y + 10, '', 8, '#ffffff', { stroke: '#07060e', strokeThickness: 3 });
    this.infoT = txt(SIDE.x + 10, SIDE.y + 24, '', 6, '#c9c4dc', { lineSpacing: 4, wordWrap: { width: SIDE.w - 20 } });
    this.buyT = txt(SIDE.x + SIDE.w / 2, SIDE.y + SIDE.h - 20, 'BUY', 9, '#ffffff', { stroke: '#07060e', strokeThickness: 3 }).setOrigin(0.5, 0.5);
    this.prevT = txt(SIDE.x + 20 + BTN.prevW / 2, SIDE.y + SIDE.h - 20, 'PREVIEW', 6, '#ffffff').setOrigin(0.5, 0.5);
    // the shopkeeper's face, on his screen (glowing: the line art is filled with the screen's colour)
    this.faceImg = this.add.sprite(KP.x, KP.y, 'shop_face_calm', 0).setTintMode(Phaser.TintModes.FILL).setTint(0x9affd8);
    this.vidImg = this.add.image(KP.x, KP.y, 'shop_face_calm').setVisible(false);   // a secret's video, on his screen (under the scanlines)
    this.front = this.add.graphics();                // over the face: scanlines, the glass, static
    this.bubbleT = txt(0, 0, '', 6, '#1a1024', { align: 'center' }).setOrigin(0.5, 0.5);
    this.face = 'calm'; this.faceT = 0; this.jolt = 0; this.faceStart = 0; this.static = 12; this.saying = ''; this.sayT = 0; this.lastSel = -1;
    this.react('happy', 'hello', 200);
    this.msgT = txt(W / 2, H - 22, '', 7, '#ff8a8a').setOrigin(0.5, 1);
    hintBar(this, 'ARROWS PICK   Q/E TAB   J / ENTER / A BUY / SWITCH ON / SPIN   P PREVIEW   K / ESC / B  BACK', ACC);
    makeButton(this, 8, 6, '< BACK', () => this.back());
    addFullscreenButton(this, W - 8, 6);
    this.msg = 0;
    this.noliClip = null; this.voice = null; this.hushUntil = 0;
    // overlays: the costume PREVIEW and the gacha SPIN, drawn over everything
    this.ov = this.add.graphics().setDepth(50);
    this.ovSpr = this.add.sprite(W / 2, 300, 'ss_idle', 0).setDepth(51).setVisible(false);
    this.dollSpr = [51, 51.1, 50.9].map((d) => this.add.sprite(W / 2, 190, 'shop_dolls', 0).setDepth(d).setVisible(false));   // (the next doll sits behind the open bottom half)   // the nesting doll opening: bottom half, top half, the next doll peeking out
    this.ovT = txt(W / 2, 30, '', 12, '#ffffff', { stroke: '#0b0a14', strokeThickness: 4 }).setOrigin(0.5).setDepth(52);
    this.ovSub = txt(W / 2, 50, '', 7, '#c9c4dc', { align: 'center' }).setOrigin(0.5, 0).setDepth(52);
    this.ovHelp = txt(W / 2, H - 8, '', 5, '#8a87a3').setOrigin(0.5, 1).setDepth(52);
    this.ovList = txt(W / 2, 100, '', 7, '#ffffff', { align: 'center', lineSpacing: 8 }).setOrigin(0.5, 0).setDepth(52);
    this.pv = null; this.spin = null;
    // secrets: the code screen and the video on his screen
    this.secret = null; this.bellRings = []; this.bellWobble = 0;
    this.tvT = txt(KP.x - 4, KP.y - 16, '', 5, '#9affd8', { align: 'center' }).setOrigin(0.5).setDepth(1);
    this.tvCode = txt(KP.x - 4, KP.y + 6, '', 6, '#d8fff0').setOrigin(0.5).setDepth(1);
    this.playing = null; this.idle = 0;
    // (the scene object is reused on every visit: forget objects made on an earlier visit - they were destroyed with it)
    this.keyT = this.keyHint = this.kg = this.lookG = this.lookBg = this.osd = this.lookFx = this.lookObjs = this.decor = null; this.look = null;
    // leaving the shop any way at all: stop the secret's sound and listeners, without touching the scene's (already torn down) display
    this.events.once('shutdown', () => { this.noli = false; unreveal('noli'); this.riphood = this.soviet = false; this.mode = null; unreveal('riphood'); unreveal('papers'); this.dropLook(); this.closeSecret(true, true); this.stopPlaying(true, true); if (this.noliClip) { try { this.noliClip.pause(); } catch (e) { /* gone */ } this.noliClip = null; } if (this.voice) { try { this.voice.destroy(); } catch (e) { /* gone */ } this.voice = null; } });
    // the room behind it all: a dark shop, shelves, a hanging lamp
    this.drawShelfBack();
    // mouse: tabs, cards, BUY
    this.input.on('pointerdown', (p, over) => {
      this.idle = 0;
      if (this.secret) {
        for (let i = 0; i < KEYPAD.keys.length; i++) { const [x, y] = this.keyAt(i); if (p.x >= x && p.x <= x + KEYPAD.w && p.y >= y && p.y <= y + KEYPAD.h) { this.secret.cur = i; this.secret.press = 6; return this.typeKey(KEYPAD.keys[i]); } }
        return;
      }
      if (this.pv || this.spin) { this.clicked = this.pv && p.x < W / 3 ? 'pvprev' : this.pv && p.x > W * 2 / 3 ? 'pvnext' : 'ovok'; return; }
      if (Math.hypot(p.x - BELL.x, p.y - BELL.y) < BELL.r) return this.ringBell();
      if (this.soviet) for (const [x, y, w, h, k] of EGGS) if (p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h) { this.react('grin', k, 160); sfx('ding', 0.25, 1.6); return; }   // the other countries' things
      if (over.length) return;
      for (let i = 0; i < SHOP.length; i++) { const x = TAB.x + i * (TAB.w + TAB.gap); if (p.x >= x && p.x <= x + TAB.w && p.y >= TAB.y && p.y <= TAB.y + TAB.h) { this.setTab(i); return; } }
      for (let i = 0; i < PER; i++) { const [x, y] = this.cardAt(i); if (p.x >= x && p.x <= x + GRID.w && p.y >= y && p.y <= y + GRID.h) { if (this.sel === i) this.clicked = 'buy'; else { this.sel = i; sfx('menu', 0.4); } return; } }
      if (this.pages() > 1 && p.y >= PAGE.y - 8 && p.y <= PAGE.y + 8) { if (Math.abs(p.x - PAGE.x + 44) < 10) return this.flip(-1); if (Math.abs(p.x - PAGE.x - 44) < 10) return this.flip(1); }   // the page arrows
      if (p.x >= SIDE.x + 20 && p.x <= SIDE.x + SIDE.w - 20 && p.y >= BTN.y && p.y <= BTN.y + BTN.h) this.clicked = this.item() && this.item().kind === 'costume' && p.x < SIDE.x + 20 + BTN.prevW ? 'preview' : 'buy';
      if (Math.hypot(p.x - KP.x, p.y - KP.y) < 50) { if (this.playing) this.stopPlaying(); else this.react('shock', 'poke'); }   // poke the shopkeeper (or switch his secret off)
    });
  }

  // the panel behind the cards (redrawn when the shop changes colour)
  drawShelfBack() { const b = this.bg; b.clear(); panel(b, GRID.x - 8, GRID.y - 8, GRID.cols * (GRID.w + GRID.gap) + 12, GRID.rows * (GRID.h + GRID.gap) + 10, this.acc, { sk: 6, fill: this.pal.cardIn }); }
  // the shop's own music: the title theme, or RIPHOOD's song while it's a supply depot
  homeMusic() { return this.mode ? TAKEOVERS[this.mode].music : 'bgm_title'; }
  // a line he says: RIPHOOD's radio-operator version when there is one
  lines(k) { return (this.mode && KEEPER[TAKEOVERS[this.mode].lines][k]) || KEEPER.lines[k]; }
  // what the money is called right now (RUBLES in the PEOPLE'S STORE)
  cur() { return (this.mode && TAKEOVERS[this.mode].currency) || CURRENCY.name; }
  cardAt(i) { const c = i % GRID.cols, r = Math.floor(i / GRID.cols); return [GRID.x + c * (GRID.w + GRID.gap), GRID.y + r * (GRID.h + GRID.gap)]; }
  setTab(i) { if (i !== this.tab) { this.tab = i; this.sel = 0; this.page = 0; this.lastSel = 0; this.preview(); sfx('menu', 0.5, 1.2); if (SHOP[i].name === 'GAMBLING') this.react('money', 'gamble'); else this.react('happy', 'tab'); this.static = 8; } }
  item() { return shelfItems(SHOP[this.tab])[this.page * PER + this.sel] || null; }
  // a shelf with more than 8 things has pages: left/right off the end of a page turns it
  pages() { return Math.max(1, Math.ceil(shelfItems(SHOP[this.tab]).length / PER)); }
  flip(d) { const n = this.pages(); if (n < 2) return; this.page = (this.page + d + n) % n; if (!this.item()) this.sel = 0; this.lastSel = -2; sfx('menu', 0.5, 1.1); }
  back() { this.closeSecret(true); this.stopPlaying(true); sfx('menu', 0.6); playMusic(this, 'bgm_title'); this.scene.start('Trinkets'); }
  // a music card picked: play that track; anything else: the shop goes back to the title music
  preview() { if (this.playing) return; const it = this.item(); playMusic(this, it && it.kind === 'music' ? 'bgm_shop_' + it.id.slice(4) : this.homeMusic(), it && it.kind === 'music' ? 0.55 : 0.6); }
  // what the big button says for this item
  label(it) {
    if (!it) return '-';
    if (it.gacha) return 'SPIN';
    if (!owns(it.id)) return 'BUY';
    if (it.kind === 'costume' || it.kind === 'unlock') return 'OWNED';
    return isEquipped(it.kind, it.id) ? 'SWITCH OFF' : 'SWITCH ON';
  }
  buy() {
    const it = this.item();
    if (!it) { this.react('shock', 'empty'); sfx('curse', 0.3, 1.5); return; }
    if (!it.gacha && owns(it.id)) {                                                   // already yours
      if (it.kind === 'costume') { this.react('smug', 'owned'); this.say('PICK IT ON THE SELECT SCREEN.', '#c9c4dc'); return; }
      if (it.kind === 'unlock') { this.react('smug', 'owned'); this.say((it.stage || 'IT') + ' IS ON THE STAGE SELECT SCREEN.', '#c9c4dc'); return; }
      const on = toggleEquip(it.kind, it.id);
      if (on) { this.react('smug', 'equip'); sfx('ding', 0.3, 1.3); } else { this.react('bow', 'unequip'); sfx('menu', 0.5, 0.8); }
      this.say(on ? it.name + ' IS ON' + (it.kind === 'extra' ? '' : ' (ONLY ONE AT A TIME)') : it.name + ' IS OFF', on ? '#7aff8a' : '#c9c4dc');
      return;
    }
    if (it.gacha && !gachaPool(it.gacha).some((x) => !owns(x.id))) { this.react('bow', 'soldout'); this.say('SOLD OUT: YOU OWN EVERYTHING THIS MACHINE GIVES.', '#c9c4dc'); return; }
    if (getCoins() < it.price) { this.react('shock', it.gacha ? 'spin' : 'broke'); sfx('curse', 0.3, 1.5); return; }
    if (it.gacha) return this.startSpin(it);
    buyItem(it.id, it.price); stat('spent', it.price); this.cheevos();
    this.react('smug', 'bought', 140); sfx('ding', 0.45, 1.6); this.static = 8;
    if (it.kind === 'costume') { this.say('NEW COSTUME! PICK IT ON THE SELECT SCREEN.', '#7aff8a'); return; }
    if (it.kind === 'unlock') { this.react('grin', 'bought', 140); this.say('NEW STAGE UNLOCKED: ' + (it.stage || '') + '! PICK IT ON THE STAGE SELECT SCREEN.', '#7aff8a'); return; }
    if (!isEquipped(it.kind, it.id)) toggleEquip(it.kind, it.id);                   // bought it: it's switched on right away
    this.say(it.name + ' IS ON. PRESS AGAIN TO SWITCH IT OFF.', '#7aff8a');
  }
  // ---------------------------------------------------------------- costume PREVIEW
  openPreview(it) {
    stat('previews'); this.cheevos();
    const fd = fighterById(it.fighter); if (!fd || !fd.def) return;
    const def = fd.def, si = Math.max(0, skinsFor(def.id).findIndex((k) => k.name === it.skin)), sh = skinSheets(this, def, si);
    const n = (key) => Math.max(1, this.textures.get(key).frameTotal - 1);
    const o = [def.originX ?? 0.5, def.originY], mo = def.movesOrigin || o;
    const seq = [{ label: 'IDLE', key: sh.idle, from: 0, n: (def.frameCounts && def.frameCounts.idle) || n(sh.idle), step: 6, o, loops: 2 }];
    if (sh.run) seq.push({ label: 'RUN', key: sh.run, from: 0, n: (def.frameCounts && def.frameCounts.run) || n(sh.run), step: 5, o, loops: 3 });
    for (const k of ['jump', 'fall']) if (sh[k]) seq.push({ label: k.toUpperCase(), key: sh[k], from: 0, n: (def.frameCounts && def.frameCounts[k]) || n(sh[k]), step: 8, o, loops: 2 });
    if (def.ownAnims) for (const [k, l] of [['attack1', 'SWORD SLASH'], ['attack2', 'GRAND SLAM']]) if (sh[k]) seq.push({ label: l, key: sh[k], from: 0, n: def.frameCounts[k] || n(sh[k]), step: 5, o, loops: 1 });
    if (def.moveAnims && sh.moves) for (const [k, l] of SHOW) { const A = def.moveAnims[k]; if (A) seq.push({ label: l, key: sh.moves, from: A[0], n: A[1], step: Math.max(1, A[2]), o: mo, loops: 1 }); }
    this.pv = { it, def, seq, i: 0, t: 0 }; sfx('select', 0.5, 1.3); this.react('glasses', 'preview');
  }
  stepPreview(d) { const pv = this.pv; pv.i = (pv.i + d + pv.seq.length) % pv.seq.length; pv.t = 0; sfx('menu', 0.4); }
  closeOverlay() { if (this.spin) this.cheevos(); this.pv = null; this.spin = null; this.ov.clear(); this.ovSpr.setVisible(false); for (const d of this.dollSpr) d.setVisible(false); for (const x of [this.ovT, this.ovSub, this.ovHelp, this.ovList]) x.setText(''); }
  drawPreview(t) {
    const pv = this.pv, A = pv.seq[pv.i], o = this.ov; o.clear();
    pv.t++;
    const len = A.n * A.step * A.loops + (A.loops === 1 ? 24 : 0);
    if (pv.t >= len) { pv.i = (pv.i + 1) % pv.seq.length; pv.t = 0; }
    const B = pv.seq[pv.i], f = Math.min(B.n - 1, Math.floor(pv.t / B.step) % (B.loops === 1 ? 1e9 : B.n));
    // a dark stage under a spotlight
    o.fillStyle(0x07050c, 0.94); o.fillRect(0, 0, W, H);
    o.fillStyle(0xfff4d8, 0.05); o.fillTriangle(W / 2 - 30, 0, W / 2 + 30, 0, W / 2 + 150, 300); o.fillTriangle(W / 2 - 30, 0, W / 2 - 150, 300, W / 2 + 150, 300);
    o.fillStyle(0x2a1a40, 1); o.fillEllipse(W / 2, 302, 300, 26); o.fillStyle(0x4a2e6a, 1); o.fillEllipse(W / 2, 300, 260, 18);
    o.fillStyle(0xfff4d8, 0.1); o.fillEllipse(W / 2, 300, 160, 10);
    for (const [k, x] of [[-1, 40], [1, W - 40]]) { o.fillStyle(C.gold, 0.6 + 0.4 * Math.sin(t * 0.1)); o.fillTriangle(x - 6 * k, 170, x - 6 * k, 190, x + 6 * k, 180); }   // < > arrows
    this.ovSpr.setVisible(true).setTexture(B.key, B.from + f).setOrigin(B.o[0], B.o[1]).setScale(2).setFlipX(!!pv.def.facesLeft).setPosition(W / 2, 300);
    this.ovT.setText(pv.it.name);
    this.ovSub.setText(pv.def.name + '\n' + B.label + '   (' + (pv.i + 1) + '/' + pv.seq.length + ')');
    this.ovHelp.setText(owns(pv.it.id) ? 'A/D CHANGE MOVE    K / ESC / B  CLOSE    (OWNED: PICK IT ON THE SELECT SCREEN)' : 'A/D CHANGE MOVE    J / ENTER / A  BUY FOR ' + pv.it.price + ' ' + this.cur() + '    K / ESC / B  CLOSE');
  }

  // ---------------------------------------------------------------- GACHA
  startSpin(it) {
    addCoins(-it.price); stat('spent', it.price); stat('spins', it.gacha.pulls);
    const res = [];
    for (let i = 0; i < it.gacha.pulls; i++) {
      let pool = gachaPool(it.gacha);
      if (it.gacha.fresh) pool = pool.filter((x) => !owns(x.id));
      if (!pool.length) { addCoins(Math.round(it.price / it.gacha.pulls)); continue; }   // (nothing left for this pull: its share comes back)
      const odds = it.gacha.odds || {}, w = (x) => odds[x.id] ?? 1;                       // (the MATRYOSHKA dolls weigh their prizes)
      let roll = Math.random() * pool.reduce((n, x) => n + w(x), 0), prize = pool[pool.length - 1];
      for (const x of pool) { roll -= w(x); if (roll < 0) { prize = x; break; } }
      if (owns(prize.id)) { const back = Math.round(prize.price * GACHA_REFUND); addCoins(back); res.push({ prize, dupe: true, back }); }
      else { grantItem(prize.id); res.push({ prize, dupe: false }); }
    }
    this.spin = { it, res, i: 0, t: 0, done: !res.length };
    this.react('money', 'gamble'); sfx('ding', 0.35, 0.8);
  }
  drawSpin(t) {
    const S = this.spin, o = this.ov; o.clear(); S.t++;
    o.fillStyle(0x07050c, 0.94); o.fillRect(0, 0, W, H);
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2 + t * 0.004; o.fillStyle(i % 2 ? 0x1a1030 : 0x24143e, 1); o.fillTriangle(W / 2, 170, W / 2 + Math.cos(a) * 500, 170 + Math.sin(a) * 500, W / 2 + Math.cos(a + 0.13) * 500, 170 + Math.sin(a + 0.13) * 500); }
    this.ovT.setText(S.it.name);
    if (S.done) {                                                           // the summary
      this.ovSpr.setVisible(false);
      const news = S.res.filter((r) => !r.dupe).length, back = S.res.reduce((n, r) => n + (r.back || 0), 0);
      this.ovSub.setText(news + ' NEW' + (back ? '   ' + back + ' ' + this.cur() + ' BACK FROM DUPLICATES' : ''));
      this.ovList.setText(S.res.map((r) => (r.dupe ? '   ' : 'NEW ') + r.prize.name + (r.dupe ? '  (+' + r.back + ')' : '')).join('\n'));
      this.ovHelp.setText('NEW STAGE EFFECTS, TRACKS AND EXTRAS: SWITCH THEM ON IN THEIR SHELF    J / K  CLOSE');
      return;
    }
    const r = S.res[S.i], cx = W / 2, cy = 190;
    this.ovList.setText(''); this.ovHelp.setText('J / ENTER / A  ' + (S.i + 1 < S.res.length ? (S.it.gacha.machine === 'doll' ? 'NEXT DOLL' : 'NEXT CAPSULE') : 'DONE') + '    (' + (S.i + 1) + '/' + S.res.length + ')');
    const T = S.t;
    for (const d of this.dollSpr) d.setVisible(false);
    if (S.it.gacha.machine === 'doll' && T < 90) return this.dollOpen(S, r, T, cx, cy);
    if (T < 70) {                                                           // the machine, crank turning, a capsule rolling out
      this.ovSub.setText(S.it.gacha.machine === 'supply' ? 'INCOMING SUPPLY DROP...' : 'TURNING THE CRANK...'); this.ovSpr.setVisible(false);
      this.machine(o, cx, cy - 20 + (T < 50 ? Math.sin(T * 0.8) * (T > 30 ? 2 : 0) : 0), 64, S.it, t * (T < 50 ? 6 : 1));
      if (T === 20 || T === 35) sfx('menu', 0.5, 0.6);
      if (T >= 50) { const p = (T - 50) / 20, y = cy + 50 + Math.abs(Math.sin(p * Math.PI * 2)) * -20 * (1 - p); this.capsule(o, cx + p * 40, y, r, 0); }
      if (T === 50) sfx('ding', 0.3, 0.7);
      return;
    }
    if (T < 90) { const k = (T - 70) / 20; this.capsule(o, cx, cy, r, k); this.ovSpr.setVisible(false); if (T === 89) sfx(r.dupe ? 'menu' : 'select', 0.6, r.dupe ? 0.7 : 1.4); return; }   // it wobbles, then pops
    // the prize
    if (T === 90) { if (r.dupe) this.react('melt', 'dud'); else { this.react('grin', 'jackpot'); this.static = 8; } }
    const glow = r.dupe ? 0x5a4a70 : r.prize.color ?? C.gold;
    for (let i = 5; i > 0; i--) { o.fillStyle(glow, 0.08); o.fillCircle(cx, cy, 30 + i * 14 + Math.sin(t * 0.1) * 3); }
    if (T < 96) { o.fillStyle(0xffffff, 1 - (T - 90) / 6); o.fillRect(0, 0, W, H); }
    o.fillStyle(0x140a20, 1); o.fillRect(cx - 50, cy - 38, 100, 76);
    o.lineStyle(2, glow, 1); o.strokeRect(cx - 50, cy - 38, 100, 76);
    if (r.prize.kind === 'costume') {
      const fd = fighterById(r.prize.fighter), si = Math.max(0, skinsFor(fd.def.id).findIndex((k) => k.name === r.prize.skin));
      showFighter(this.ovSpr.setVisible(true), fd.def, Math.floor(t / 6), si); this.ovSpr.setScale(Math.min(1.2, 70 / this.ovSpr.frame.height)).setPosition(cx, cy + 34).setFlipX(!!fd.def.facesLeft);
    } else if (r.prize.img) { this.icon(o, cx, cy, 16, r.prize, t); this.ovSpr.setVisible(true).setTexture(r.prize.img, r.prize.imgFrame ?? 0).setOrigin(0.5).setFlipX(false).setScale(1).setPosition(cx, cy); }
    else { this.ovSpr.setVisible(false); this.icon(o, cx, cy, 16, r.prize, t); }
    this.ovSub.setText((r.dupe ? 'DUPLICATE: ' + r.prize.name + '  +' + r.back + ' ' + this.cur() : 'NEW! ' + r.prize.name) + '\n' + this.shelfOf(r.prize));
  }
  shelfOf(it) { const tb = SHOP.find((x) => x.items.includes(it)); return tb ? 'FROM THE ' + tb.name + ' SHELF' : ''; }
  // a MATRYOSHKA doll opening (one doll per prize, each smaller than the last): it wobbles, the top half twists and lifts
  // off, and the next doll - or, in the last one, the prize - is inside. The painted dolls are shop_dolls.png
  // (tools/sprites/soviet_art.py): three paint jobs x [whole, top half, bottom half]
  dollOpen(S, r, T, cx, cy) {
    const paint = S.it.gacha.paint || 0, n = S.res.length, sc = 2.2 - (S.i / Math.max(1, n - 1 || 1)) * (n > 1 ? 0.9 : 0), f0 = paint * 3;
    const [bot, top, next] = this.dollSpr, base = cy + 56;
    this.ovSub.setText(n > 1 ? 'DOLL ' + (S.i + 1) + ' OF ' + n + '...' : 'OPENING THE DOLL...');
    if (T < 40) {                                                           // it sits there, then rocks, faster and faster
      const k = T < 14 ? 0 : (T - 14) / 26, rock = Math.sin(T * (0.3 + k * 0.6)) * 0.12 * k;
      bot.setVisible(true).setTexture('shop_dolls', f0).setOrigin(0.5, 1).setScale(sc).setPosition(cx, base).setRotation(rock);
      if (T === 20 || T === 32) sfx('menu', 0.4, 0.7 + k * 0.4);
      return;
    }
    const p = Math.min(1, (T - 40) / 22), ease = 1 - (1 - p) * (1 - p);   // the top half twists off and floats up and away
    if (T === 40) sfx('whoosh', 0.4, 1.4);
    bot.setVisible(true).setTexture('shop_dolls', f0 + 2).setOrigin(0.5, 1).setScale(sc).setPosition(cx, base).setRotation(0);
    const last = S.i === n - 1;
    if (!last || T >= 70) {                                                 // inside: the next doll, smaller (the prize comes out of the last one)
      const s2 = sc * 0.72, rise = Math.min(1, Math.max(0, (T - 52) / 18));
      if (!last) next.setVisible(true).setTexture('shop_dolls', f0).setOrigin(0.5, 1).setScale(s2).setPosition(cx, base - 8 * sc - rise * 30 * sc * 0.5);
    }
    top.setVisible(true).setTexture('shop_dolls', f0 + 1).setOrigin(0.5, 1).setScale(sc).setPosition(cx + ease * 40, base - 26 * sc * 0.5 - ease * 70).setRotation(ease * 0.9).setAlpha(1 - Math.max(0, p - 0.6) * 2.5);
    const o = this.ov, glow = r.dupe ? 0x5a4a70 : r.prize.color ?? 0xffc83a;   // light spilling out of the open doll
    for (let i = 4; i > 0; i--) { o.fillStyle(glow, 0.06 * ease); o.fillCircle(cx, base - 30 * sc * 0.5, 20 + i * 12); }
    if (T === 88) sfx(r.dupe ? 'menu' : 'select', 0.6, r.dupe ? 0.7 : 1.4);
  }
  // a capsule: two coloured halves; k 0..1 = wobbling, about to pop
  capsule(o, x, y, r, k) {
    const col = r.dupe ? 0x8a87a3 : r.prize.color ?? 0xff5a6a, w = Math.sin(k * 30) * k * 4;
    o.fillStyle(0x1a1424, 1); o.fillCircle(x + w, y, 15);
    o.fillStyle(col, 1); o.slice(x + w, y, 14, Math.PI, 0, false); o.fillPath();
    o.fillStyle(0xf4f0fa, 1); o.slice(x + w, y, 14, 0, Math.PI, false); o.fillPath();
    o.fillStyle(0xffffff, 0.6); o.fillEllipse(x + w - 5, y - 7, 6, 3);
    o.fillStyle(0x1a1424, 1); o.fillRect(x + w - 14, y - 1, 28, 2);
  }
  // ---------------------------------------------------------------- SECRETS: the bell, the code screen, the video
  ringBell() {
    sfx('ding', 0.5, 2.2); this.bellWobble = 14; stat('bells'); this.cheevos();
    this.bellRings = this.bellRings.filter((r) => this.t - r < BELL.window); this.bellRings.push(this.t);
    if (this.bellRings.length >= BELL.rings) { this.bellRings = []; this.openCode(); } else if (!this.secret) this.react('stare');
  }
  // his screen asks for a code. Type it on your keyboard (read straight from the page, no clicking into anything first),
  // or tap / pick the letters on the on-screen keypad that covers the shelves (phones, gamepads).
  openCode() {
    this.secret = { mode: 'code', t: 0, typed: '', cur: 0 }; this.static = 10; this.jolt = 10; sfx('glitch', 0.4, 0.8);
    const L = this.lines('secret'); this.sayClean = L[Math.floor(Math.random() * L.length)]; this.saying = this.noli ? glitchLine(this.sayClean) : this.sayClean; this.sayT = 200;
    if (this.noli) this.noliVoice('loop');
    this.input.keyboard.enabled = false; this.input.keyboard.disableGlobalCapture();   // the game's own key handling steps aside
    const onKey = (e) => {
      const S = this.secret; if (!S || S.mode !== 'code') return;
      const k = e.key, mv = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -KEYPAD.cols, ArrowDown: KEYPAD.cols }[k];
      if (/^[a-zA-Z0-9]$/.test(k)) this.typeKey(k.toUpperCase());
      else if (k === 'Backspace') this.typeKey('DEL');
      else if (k === 'Enter') this.typeKey(S.typed ? 'OK' : KEYPAD.keys[S.cur]);
      else if (k === 'Escape') this.closeSecret();
      else if (mv) { S.cur = Math.min(KEYPAD.keys.length - 1, (S.cur + mv + KEYPAD.cols * KEY_ROWS * 2) % (KEYPAD.cols * KEY_ROWS)); sfx('menu', 0.25, 1.4); }
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey); this.secret.onKey = onKey;
    if (!this.keyT) this.keyT = KEYPAD.keys.map((k) => this.add.text(0, 0, k, { fontFamily: FONT, fontSize: k.length > 1 ? '7px' : '10px', color: '#d8fff0' }).setOrigin(0.5).setDepth(41).setVisible(false));
    this.keyT.forEach((t, i) => { const [x, y] = this.keyAt(i); t.setPosition(x + KEYPAD.w / 2, y + KEYPAD.h / 2).setVisible(true); });
    this.keyHint = this.keyHint || this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '6px', color: '#9affd8', align: 'center' }).setOrigin(0.5).setDepth(41);
    this.keyHint.setText('TYPE THE CODE ON YOUR KEYBOARD, OR TAP THE KEYS\nBACKSPACE / DEL ERASES   ENTER / OK SENDS   ESC / CANCEL QUITS').setPosition(KEYPAD.x + KEYPAD.cols * (KEYPAD.w + KEYPAD.gap) / 2, KEYPAD.y - 16).setVisible(true);
  }
  keyAt(i) { const c = i % KEYPAD.cols, r = Math.floor(i / KEYPAD.cols); return [KEYPAD.x + c * (KEYPAD.w + KEYPAD.gap), KEYPAD.y + r * (KEYPAD.h + KEYPAD.gap)]; }
  typeKey(k) {
    const S = this.secret; if (!S || S.mode !== 'code') return;
    if (k === 'OK') return this.submitCode();
    if (k === 'CANCEL') return this.closeSecret();
    if (k === 'DEL') { S.typed = S.typed.slice(0, -1); sfx('menu', 0.3, 0.9); return; }
    if (S.typed.length < 12) { S.typed += k; sfx('menu', 0.3, 1.6); S.cur = Math.max(0, KEYPAD.keys.indexOf(k)); }
  }
  hideKeypad() { if (this.kg) this.kg.clear(); if (this.keyT) this.keyT.forEach((t) => t.setVisible(false)); if (this.keyHint) this.keyHint.setVisible(false); }
  submitCode() {
    const code = this.secret.typed, S = SECRETS[code];
    if (!S) { this.secret.typed = ''; this.static = 8; this.react('shock', 'wrongcode'); this.secret.t = 0; sfx('curse', 0.3, 1.6); return; }
    window.removeEventListener('keydown', this.secret.onKey); this.hideKeypad(); this.input.keyboard.enabled = true; this.input.keyboard.enableGlobalCapture();
    this.secret = null; this.tvT.setText(''); this.tvCode.setText('');
    addSecret(code); this.cheevos();
    if (TAKEOVERS[S.takeover]) return this.becomeTakeover(S);
    if (S.call) return this.takeCall(S);
    if (S.takeover) return this.becomeNoli(S);
    this.startPlaying(code);
  }
  // 13: the lights in his screen go out, a phone rings, and a doll's face looks out at you - then a new stage is open
  takeCall(S) {
    this.stopPlaying(true);
    this.call = 150; this.static = 20; this.jolt = 12; sfx('phone', 0.6); this.time.delayedCall(1150, () => sfx('phone', 0.6));
    this.react('stare', S.line, 220);
    this.time.delayedCall(2600, () => { this.react('shock', 'thirteen2', 160); sfx('scream', 0.25, 0.9); this.cameras.main.shake(250, 0.006); this.say('NEW STAGE UNLOCKED: ' + S.stage + '! PICK IT ON THE STAGE SELECT SCREEN.', '#ff5a6a'); });
  }
  // NOLI: he changes for good (the face, the lines, the haze), and the clip plays
  becomeNoli(S) {
    this.stopPlaying(true); this.endTakeover();
    this.noli = true; this.setLook(S.look); reveal('noli');   // his own items appear on the shelves (shop.js hidden: 'noli')
    if (this.noliClip) { try { this.noliClip.pause(); } catch (e) { /* gone */ } }
    const a = this.noliClip = new Audio(); a.src = S.clip.find((u) => a.canPlayType(u.endsWith('ogg') ? 'audio/ogg; codecs="vorbis"' : 'audio/mpeg')) || S.clip[S.clip.length - 1];
    a.volume = Math.min(1, Math.max(settings.musicVolume, settings.sfxVolume)); a.play().catch(() => {});
    stopMusic(); this.time.delayedCall(5300, () => { if (!this.playing) playMusic(this, this.homeMusic()); });   // the shop's music waits for the clip
    this.static = 30; this.jolt = 16; this.cameras.main.shake(300, 0.006); this.hushUntil = this.t + 320;
    this.react('calm', S.line, 260);
    this.say('SOMETHING NEW IS ON THE SHELVES...', '#c77dff');
  }
  // a takeover (RIPHOOD, PAPERSPLEASE): the whole shop changes until you leave - its music, look, colours, title, his
  // look and lines, and the hidden items on its shelves (TAKEOVERS)
  becomeTakeover(S) {
    this.stopPlaying(true); this.endTakeover();
    const T = TAKEOVERS[S.takeover];
    this.noli = false;                                       // (NOLI steps aside - his things stay on the shelves this visit)
    this.mode = S.takeover; this.riphood = this.mode === 'riphood'; this.soviet = this.mode === 'soviet'; reveal(T.tag);
    this.acc = T.acc; this.pal = T.pal; this.drawShelfBack();
    for (const o of [this.banner.g, this.banner.text, this.banner.crumb]) if (o) o.setVisible(false);
    this.banner2 = titleBanner(this, T.title, T.acc);
    this.setLook(T.look);
    stopMusic(); playMusic(this, T.music, 0.6);
    this.nextRumble = this.t + 200;
    this.static = 26; this.jolt = 16; this.cameras.main.shake(380, 0.008); sfx('thunder', 0.5, this.soviet ? 0.7 : 0.5);
    this.react(T.face, S.line, 240);
    this.say(T.say[0], T.say[1]);
    if (this.soviet) this.cheevos();                         // OUR VICTORY
  }
  // back to the normal shop (another code typed over it)
  endTakeover() {
    if (!this.mode) return;
    this.mode = null; this.riphood = this.soviet = false; this.acc = ACC; this.pal = PAL; this.drawShelfBack();
    for (const o of [this.banner.g, this.banner.text, this.banner.crumb]) if (o) o.setVisible(true);
    if (this.banner2) { for (const o of [this.banner2.g, this.banner2.text, this.banner2.crumb]) if (o) o.destroy(); this.banner2 = null; }
  }
  // ---- a secret playing: drawn on his screen every frame (drawPlaying) while the shop carries on as normal
  startPlaying(code) {
    this.stopPlaying(true);
    const S = SECRETS[code], key = 'secret_tv', vol = Math.min(1, settings.musicVolume);
    if (this.textures.exists(key)) this.textures.remove(key);
    const tex = this.textures.createCanvas(key, S.px, S.px); tex.context.fillStyle = '#000'; tex.context.fillRect(0, 0, S.px, S.px); tex.refresh();
    this.vidImg.setTexture(key).setScale(68 / S.px).setVisible(true);
    stopMusic();
    const P = this.playing = { code, S, tex, t: 0 };
    if (S.video) {   // a hidden <video>, drawn every frame into the little canvas texture (chunky pixels)
      const v = P.v = document.createElement('video');
      v.src = S.video.find((u) => v.canPlayType(u.endsWith('webm') ? 'video/webm; codecs="vp9, opus"' : 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"')) || S.video[S.video.length - 1];
      v.playsInline = true; v.preload = 'auto'; v.volume = vol;
      v.addEventListener('ended', () => { if (this.playing === P) this.stopPlaying(); });
      v.play().catch(() => {});
    }
    if (S.audio) {
      const a = P.a = new Audio(); a.src = S.audio.find((u) => a.canPlayType(u.endsWith('ogg') ? 'audio/ogg; codecs="vorbis"' : 'audio/mpeg')) || S.audio[S.audio.length - 1];
      a.loop = true; a.volume = vol; a.play().catch(() => {});
    }
    this.setLook(S.look);
    this.static = 14; this.react('calm', S.line, 260);
    this.say(S.look === 'vhs' ? 'CLICK HIS SCREEN TO MAKE IT STOP.' : 'CLICK HIS SCREEN TO SWITCH IT OFF. KEEP SHOPPING IF YOU LIKE.', '#c9c4dc');
  }
  // quiet: no reaction or music change; dying: the scene is shutting down, so only the sound, filters and references go
  stopPlaying(quiet, dying) {
    const P = this.playing; if (!P) return;
    this.playing = null;
    for (const m of [P.v, P.a]) if (m) { try { m.pause(); m.removeAttribute('src'); m.load(); } catch (e) { /* gone */ } }
    if (dying) { this.dropLook(); return; }
    this.setLook(this.noli ? 'noli' : this.mode ? TAKEOVERS[this.mode].look : null);
    if (!quiet) { this.vidImg.setVisible(false); this.static = 14; this.react('happy', 'off'); playMusic(this, this.homeMusic()); this.preview(); }
  }
  // draw the playing secret into his screen's texture
  drawPlaying(t) {
    const P = this.playing, S = P.S, c = P.tex.context, px = S.px; P.t++;
    if (S.video) { if (P.v.readyState >= 2) { c.drawImage(P.v, 0, 0, px, px); P.tex.refresh(); } return; }
    // an animation, worn out like an old tape: rows slip sideways, a tracking band rolls down, snow
    const src = this.textures.get(S.anim), n = src.frameTotal - 1, fr = src.get(Math.floor(P.t * S.fps / 60) % n);
    c.fillStyle = '#050304'; c.fillRect(0, 0, px, px);
    const img = fr.source.image, band = (P.t * 0.6) % (px + 20) - 10;
    for (let y = 0; y < px; y++) {
      const tear = Math.abs(y - band) < 4 ? Math.round((Math.random() - 0.5) * 8) : (Math.random() < 0.015 ? Math.round((Math.random() - 0.5) * 6) : 0);
      c.drawImage(img, fr.cutX, fr.cutY + y, px, 1, tear, y, px, 1);
    }
    c.globalAlpha = 0.25; c.fillStyle = '#ff2030'; c.fillRect(0, 0, 1, px); c.globalAlpha = 1;
    for (let i = 0; i < 40; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.6)'; c.fillRect(Math.random() * px, Math.random() * px, 1, 1); }
    if (Math.abs(band) < px) { c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(0, band - 2, px, 4); }
    P.tex.refresh();
    if (S.scream && this.cache.audio.exists('sfx_seen_scream') && P.t % Math.round(S.scream * 60) === 30) this.sound.play('sfx_seen_scream', { volume: 0.3 * settings.sfxVolume, rate: 0.9 + Math.random() * 0.15 });   // her scream, now and then
  }
  // the whole shop's look while a secret plays: 'backrooms', 'vhs' or null (normal)
  // take the camera filters off (if the camera's still there) and forget the look's objects - safe while shutting down
  dropLook() {
    const cam = this.cameras && this.cameras.main;
    if (this.lookFx) { for (const f of this.lookFx) { try { cam.filters.external.remove(f); } catch (e) { /* no filters / no camera */ } } this.lookFx = null; }
    if (cam) cam.setScroll(0, 0);
    this.lookG = this.lookBg = this.osd = this.lookObjs = null; this.look = null;
  }
  setLook(look) {
    const cam = this.cameras.main;
    if (this.lookFx) { for (const f of this.lookFx) { try { cam.filters.external.remove(f); } catch (e) { /* no filters */ } } this.lookFx = null; }
    if (this.lookG) { this.lookG.destroy(); this.lookG = null; } if (this.lookBg) { this.lookBg.destroy(); this.lookBg = null; }
    if (this.osd) { this.osd.forEach((x) => x.destroy()); this.osd = null; }
    if (this.lookObjs) { this.lookObjs.forEach((x) => x.destroy()); this.lookObjs = null; }
    cam.setScroll(0, 0);
    this.look = look; if (!look) return;
    this.lookG = this.add.graphics().setDepth(95);                                  // over everything (but the achievement banners)
    try {
      const cm = cam.filters.external.addColorMatrix();
      if (look === 'backrooms') { cm.colorMatrix.sepia(); this.lookFx = [cm]; }
      else if (look === 'noli') { cm.colorMatrix.saturate(-0.25); this.lookFx = [cm, cam.filters.external.addVignette(0.5, 0.5, 0.95, 0.2)]; }
      else if (look === 'soviet') { cm.colorMatrix.saturate(0.08); this.lookFx = [cm, cam.filters.external.addVignette(0.5, 0.5, 0.92, 0.22)]; }   // PAPERSPLEASE: rich reds, dark corners
      else if (look === 'ww2') { cm.colorMatrix.saturate(-0.28); this.lookFx = [cm, cam.filters.external.addVignette(0.5, 0.5, 0.92, 0.25)]; }   // WW2: drained colour, dark corners
      else { cm.colorMatrix.saturate(-0.55); this.lookFx = [cm, cam.filters.external.addBarrel(1.03), cam.filters.external.addVignette(0.5, 0.5, 0.9, 0.3)]; }   // VHS: washed out, a curved old screen, dark corners
    } catch (e) { this.lookFx = null; }                                             // (no WebGL filters: the overlays still do the job)
    if (look === 'backrooms') {                                                     // the Backrooms: yellow wallpaper, damp carpet, a ceiling of buzzing lights
      const b = this.lookBg = this.add.graphics(); this.children.moveBelow(b, this.g);   // just over the shop's own backdrop
      b.fillStyle(0xc9b260, 1); b.fillRect(0, 0, W, H);
      for (let x = 0; x < W; x += 8) { b.fillStyle(0xb8a050, 1); b.fillRect(x, 44, 2, H - 44); b.fillStyle(0xd8c478, 0.6); b.fillRect(x + 4, 44, 1, H - 44); }
      for (let y = 60; y < H - 30; y += 22) for (let x = (y / 22 % 2) * 11; x < W; x += 22) { b.fillStyle(0xa8904a, 0.7); b.fillRect(x, y, 3, 3); }
      b.fillStyle(0xe0d8b0, 1); b.fillRect(0, 0, W, 44);
      for (let x = 0; x < W; x += 80) { b.lineStyle(1, 0xb8b090, 1); b.strokeRect(x, 0, 80, 44); }
      b.fillStyle(0x7a6a34, 1); b.fillRect(0, H - 30, W, 30); for (let i = 0; i < 300; i++) { b.fillStyle(Math.random() < 0.5 ? 0x6a5a2a : 0x8a7a44, 1); b.fillRect(Math.random() * W, H - 30 + Math.random() * 30, 2, 1); }
    } else if (look === 'soviet') {                                                 // PAPERSPLEASE: a red state hall - striped walls, a gold rail, a parquet floor, a big star
      const b = this.lookBg = this.add.graphics(); this.children.moveBelow(b, this.g);
      b.fillStyle(0x5a0e12, 1); b.fillRect(0, 0, W, H);
      for (let x = 0; x < W; x += 24) { b.fillStyle(0x4a0a0e, 1); b.fillRect(x, 0, 12, H); b.fillStyle(0x8a6a20, 0.35); b.fillRect(x + 11, 0, 1, H); }
      b.fillStyle(0xc8962a, 1); b.fillRect(0, 42, W, 2); b.fillRect(0, H - 34, W, 2);                               // gold rails
      b.fillStyle(0x3a1a0c, 1); b.fillRect(0, H - 32, W, 32);                                                         // the parquet
      for (let y = H - 32; y < H; y += 8) for (let x = (y / 8 % 2) * 10; x < W; x += 20) { b.fillStyle(0x4e2410, 1); b.fillRect(x, y, 10, 4); b.fillStyle(0x2a1208, 1); b.fillRect(x, y + 4, 10, 4); }
      const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 26 : 64; pts.push({ x: 212 + Math.cos(a) * r, y: 200 + Math.sin(a) * r }); }
      b.fillStyle(0x7a1418, 1); b.fillPoints(pts, true);                                                              // a big star on the wall behind the shelves
      this.lookObjs = [0, 1].map(() => this.add.image(0, 0, 'shop_flag_emblem').setOrigin(0).setDepth(96));         // (on the corner flags)
    } else if (look === 'ww2') {                                                    // WW2: inside a canvas supply tent - the roof, sandbags, duckboards
      const b = this.lookBg = this.add.graphics(); this.children.moveBelow(b, this.g);
      b.fillStyle(0x3e3e26, 1); b.fillRect(0, 0, W, H);                                             // canvas walls
      for (let x = 0; x < W; x += 64) { b.fillStyle(0x34341e, 1); b.fillRect(x, 0, 3, H); b.fillStyle(0x4a4a2e, 0.7); b.fillRect(x + 3, 0, 1, H); }
      for (let i = 0; i < 400; i++) { b.fillStyle((i * 7) % 3 ? 0x36361f : 0x484830, 0.6); b.fillRect((i * 7919) % W, (i * 104729) % H, 2, 1); }   // the weave
      for (let x = -40; x < W + 40; x += 32) { b.fillStyle(0x4a4a30, 1); b.fillTriangle(x, 0, x + 32, 0, x + 16, 30); b.fillStyle(0x2e2e1a, 1); b.fillRect(x + 15, 0, 2, 30); }   // the roof sagging between its poles
      b.fillStyle(0x5a4228, 1); b.fillRect(0, 0, W, 4);                                             // the ridge pole
      b.fillStyle(0x3a2c1a, 1); b.fillRect(0, H - 22, W, 22); for (let x = 0; x < W; x += 18) { b.fillStyle(0x4e3c24, 1); b.fillRect(x, H - 22, 16, 22); b.fillStyle(0x2a2012, 1); b.fillRect(x + 16, H - 22, 2, 22); }   // duckboards
      for (const [x0, n] of [[-6, 4], [W - 64, 4]]) for (let r = 0; r < 3; r++) for (let k = 0; k < n - r; k++) {   // sandbags piled in the corners
        const bx = x0 + k * 17 + r * 8, by = H - 34 - r * 10;
        b.fillStyle(0x6a5a3a, 1); b.fillEllipse(bx + 8, by + 5, 18, 11); b.fillStyle(0x8a7a52, 1); b.fillEllipse(bx + 7, by + 3, 12, 5); b.fillStyle(0x4a3e26, 1); b.fillRect(bx + 2, by + 9, 13, 1);
      }
    } else if (look === 'noli') {                                                   // NOLI: nothing extra to build - the haze is drawn live (drawLook)
    } else {                                                                        // VHS: on-screen display text
      const o = (x, y, ox, oy) => this.add.text(x, y, '', { fontFamily: FONT, fontSize: '8px', color: '#f4f4f4', shadow: { offsetX: 1, offsetY: 1, color: '#000', fill: true } }).setOrigin(ox, oy).setDepth(96);
      this.osd = [o(110, 14, 0, 0), o(16, H - 12, 0, 1), o(W - 16, H - 12, 1, 1)];   // PLAY (top, beside BACK), the title, the date + tape counter
    }
  }
  // drawn every frame over the whole shop while a look is on
  drawLook(t) {
    const g = this.lookG; if (!g) return; g.clear();
    if (this.look === 'backrooms') {
      for (let x = 40; x < W; x += 160) { const flick = (Math.sin(t * 0.7 + x) > 0.97) || ((t + x) % 233 < 3); g.fillStyle(0xfff8d8, flick ? 0.25 : 0.9); g.fillRect(x, 2, 60, 6); g.fillStyle(0xfff4c0, flick ? 0.02 : 0.07); g.fillRect(x - 30, 8, 120, 40); }
      if ((t % 400) < 4) { g.fillStyle(0x000000, 0.35); g.fillRect(0, 0, W, H); }   // the power dips for a moment
      g.fillStyle(0xffe890, 0.06); g.fillRect(0, 0, W, H);
      return;
    }
    if (this.look === 'soviet') {                                                  // snow drifting past, a warm red wash, red flags in the bottom corners
      g.fillStyle(0xc8202a, 0.05); g.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) { const x = ((i * 97 + t * (0.3 + (i % 5) * 0.08) + Math.sin(t * 0.02 + i) * 12) % (W + 20)) - 10, y = ((i * 53 + t * USSR.snow * (0.6 + (i % 3) * 0.3)) % (H + 10)) - 5; g.fillStyle(0xffffff, 0.45 + (i % 3) * 0.15); g.fillRect(x, y, 1 + (i % 4 === 0), 1 + (i % 4 === 0)); }
      [[4, H - 14, 1], [W - 4, H - 14, -1]].forEach(([px, py, d], k) => {                                     // a flag on a pole, leaning in from each corner
        const tx = px + d * 30, ty = py - 34;
        g.lineStyle(2, 0xc8962a, 1); g.lineBetween(px, py, tx, ty); g.fillStyle(0xffd040, 1); g.fillCircle(tx, ty, 2);
        const fw = 34, fh = 22, pts = [];
        for (let i = 0; i <= 8; i++) { const u = i / 8, wv = Math.sin(t * 0.12 - u * 4 + k) * 2.5 * u; pts.push({ x: tx + d * u * fw, y: ty + 2 + wv }); }
        for (let i = 8; i >= 0; i--) { const u = i / 8, wv = Math.sin(t * 0.12 - u * 4 + k) * 2.5 * u; pts.push({ x: tx + d * u * fw, y: ty + 2 + fh + wv }); }
        g.fillStyle(0xd81e1e, 1); g.fillPoints(pts, true); g.fillStyle(0xff4a3a, 0.5); g.fillRect(Math.min(tx, tx + d * fw), ty + 3, fw, 2);
        if (this.lookObjs) this.lookObjs[k].setPosition(d > 0 ? tx + 3 : tx - 19, ty + 4 + Math.sin(t * 0.12 - 0.6 + k) * 0.6).setFlipX(false);
      });
      return;
    }
    if (this.look === 'ww2') {                                                     // a lamp swinging from the ridge pole, dust in its light, a khaki wash
      const sw = Math.sin(t * 0.025) * 0.18, lx = W / 2 - 120 + Math.sin(sw) * 26, ly = 30;
      g.lineStyle(1, 0x1a1a10, 1); g.lineBetween(W / 2 - 120, 0, lx, ly - 4);
      g.fillStyle(0x2e3016, 1); g.fillTriangle(lx - 7, ly + 2, lx + 7, ly + 2, lx, ly - 5); g.fillStyle(0xffe8a0, 1); g.fillCircle(lx, ly + 3, 2.5);
      g.fillStyle(0xffe0a0, 0.045); g.fillTriangle(lx, ly, lx - 150 + sw * 200, H, lx + 150 + sw * 200, H);
      for (let i = 0; i < 18; i++) { const p = (t * 0.3 + i * 41) % H, dx = Math.sin(t * 0.02 + i) * 30 + (i - 9) * 7 * (p / H); g.fillStyle(0xfff0c8, 0.35 * (1 - p / H)); g.fillRect(lx + dx + sw * 200 * (p / H), ly + p, 1, 1); }
      g.fillStyle(0x6a5a2a, 0.06); g.fillRect(0, 0, W, H);
      if (this.rumble > 0) { this.rumble--; for (let i = 0; i < 6; i++) { g.fillStyle(0xc8b890, 0.6); g.fillRect((i * 97 + t * 3) % W, (40 - this.rumble) * 6 + (i * 31) % 30, 1, 2); } }   // dust shaken off the roof
      for (let i = 0; i < 40; i++) { g.fillStyle(Math.random() < 0.5 ? 0xffffff : 0x000000, 0.06); g.fillRect(Math.random() * W, Math.random() * H, 1, 1); }   // a little film grain
      return;
    }
    if (this.look === 'noli') {                                                    // a purple haze: a wash, slow drifting fog, purple corners, motes
      g.fillStyle(NOLI.haze, NOLI.hazeA + 0.03 * Math.sin(t * 0.02)); g.fillRect(0, 0, W, H);
      for (let i = 0; i < 7; i++) { const x = ((i * 137 + t * (0.15 + i * 0.03)) % (W + 240)) - 120, y = 60 + ((i * 71) % 260) + Math.sin(t * 0.01 + i) * 14; g.fillStyle(0xb06aff, 0.05); g.fillEllipse(x, y, 220, 70); g.fillStyle(0xd8a8ff, 0.035); g.fillEllipse(x + 20, y - 6, 130, 36); }
      for (let i = 0; i < 4; i++) { g.fillStyle(0x2a0848, 0.06); g.fillRect(i * 6, 0, 6, H); g.fillRect(W - (i + 1) * 6, 0, 6, H); g.fillRect(0, i * 5, W, 5); g.fillRect(0, H - (i + 1) * 5, W, 5); }
      for (let i = 0; i < 16; i++) { const p = ((t * 0.4 + i * 53) % (H + 20)); g.fillStyle(0xe8c8ff, 0.35 * Math.abs(Math.sin(t * 0.03 + i))); g.fillRect((i * 97 + Math.sin(t * 0.02 + i) * 10) % W, H - p, 2, 2); }
      if (Math.random() < 0.012) { g.fillStyle(0x000000, 0.25); g.fillRect(0, 0, W, H); this.static = Math.max(this.static, 4); }   // a hiccup now and then
      return;
    }
    // VHS: scanlines, a rolling tracking band, snow, a tear now and then, the tape's on-screen display
    for (let y = 0; y < H; y += 2) { g.fillStyle(0x000000, 0.16); g.fillRect(0, y, W, 1); }
    const band = (t * 1.3) % (H + 60) - 30;
    g.fillStyle(0xffffff, 0.05); g.fillRect(0, band, W, 18);
    for (let i = 0; i < 60; i++) { g.fillStyle(0xffffff, 0.25 + Math.random() * 0.4); g.fillRect(Math.random() * W, band + Math.random() * 18, 2 + Math.random() * 10, 1); }
    for (let i = 0; i < 90; i++) { g.fillStyle(Math.random() < 0.5 ? 0xffffff : 0x000000, 0.2); g.fillRect(Math.random() * W, Math.random() * H, 1, 1); }
    if (Math.random() < 0.04) { const y = Math.random() * H; g.fillStyle(0xffffff, 0.25); g.fillRect(0, y, W, 1 + Math.random() * 2); this.cameras.main.setScroll(Math.round((Math.random() - 0.5) * 4), 0); }
    else this.cameras.main.setScroll(0, 0);
    g.fillStyle(0xff2040, 0.05); g.fillRect(0, 0, 3, H); g.fillStyle(0x2040ff, 0.05); g.fillRect(W - 3, 0, 3, H);
    if (this.osd) {
      const secs = Math.floor(t / 60), cnt = '0:' + String(Math.floor(secs / 60) % 60).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0');
      this.osd[0].setText((t >> 5) % 2 ? 'PLAY  >' : 'PLAY');
      this.osd[1].setText('REMEMBER THAT DAY');
      this.osd[2].setText('OCT 29 1994  ' + cnt);
    }
  }
  closeSecret(quiet, dying) {
    const S = this.secret; if (!S) return;
    this.secret = null;
    if (S.onKey) window.removeEventListener('keydown', S.onKey);
    try { this.input.keyboard.enabled = true; this.input.keyboard.enableGlobalCapture(); } catch (e) { /* plugin gone */ }   // (always: the keyboard plugin outlives this visit)
    if (dying) return;
    this.hideKeypad();
    if (!quiet) { this.static = 10; this.tvT.setText(''); this.tvCode.setText(''); }
  }
  // the keypad over the shelves: green-screen keys like his display, the picked one lit
  drawKeypad(g, t) {
    const S = this.secret, x0 = KEYPAD.x - 14, y0 = KEYPAD.y - 32, w = KEYPAD.cols * (KEYPAD.w + KEYPAD.gap) - KEYPAD.gap + 28, h = KEY_ROWS * (KEYPAD.h + KEYPAD.gap) - KEYPAD.gap + 46;
    g.fillStyle(0x0b0a14, 0.92); g.fillRect(x0, y0, w, h); g.lineStyle(2, 0x5affb8, 0.7); g.strokeRect(x0, y0, w, h);
    if (S.press > 0) S.press--;
    KEYPAD.keys.forEach((k, i) => {
      const [x, y] = this.keyAt(i), on = i === S.cur, down = on && S.press > 0;
      g.fillStyle(down ? 0x5affb8 : on ? 0x123a2c : 0x061a14, 1); g.fillRect(x, y + (down ? 2 : 0), KEYPAD.w, KEYPAD.h);
      g.lineStyle(1, on ? 0x9affd8 : 0x2a6a50, 1); g.strokeRect(x + 0.5, y + 0.5 + (down ? 2 : 0), KEYPAD.w - 1, KEYPAD.h - 1);
      this.keyT[i].setColor(down ? '#061a14' : k === 'OK' ? '#7aff8a' : k === 'CANCEL' ? '#ff8a8a' : '#d8fff0').setY(y + KEYPAD.h / 2 + (down ? 2 : 0));
    });
  }
  // draws the code screen / video frame onto his screen (called from keeper with the screen's middle)
  drawSecret(f, cx, cy, t) {
    const S = this.secret;
    this.faceImg.setVisible(false); this.vidImg.setVisible(false);
    if (S.mode === 'code') {
      S.t++;
      f.fillStyle(0x061a14, 1); f.fillRect(cx - 36, cy - 34, 72, 68);
      const wrong = this.face === 'shock' && S.t < 60;
      this.tvT.setText(wrong ? 'WRONG\nCODE' : 'INSERT\nCODE').setColor(wrong ? '#ff8a8a' : '#9affd8').setPosition(cx, cy - 16);
      const typed = S.typed;
      this.tvCode.setText(typed + ((t >> 4) % 2 ? '_' : ' ')).setPosition(cx, cy + 8).setFontSize(typed.length > 8 ? 5 : 6);
      f.lineStyle(1, 0x9affd8, 0.6); f.strokeRect(cx - 32, cy + 1, 64, 14);
    }
  }
  // newly earned achievements: their banners slide in (achievements.js, ui/toast.js)
  cheevos() { const a = checkAchievements(); if (a.length) { achievementToasts(this, a, { delay: 600 }); if (!this.secret) this.react('grin'); } }
  say(s, color = '#ff8a8a') { this.msgT.setText(s).setColor(color); this.msg = 120; }
  // the shopkeeper reacts: a face (for `hold` frames, then back to his calm face) and a line from KEEPER.lines
  react(face, line, hold = KEEPER.hold) {
    if (face !== this.face) { this.static = 6; this.faceStart = this.t; sfx('glitch', 0.12, 1.8); }
    this.face = face; this.faceT = face === 'calm' ? 0 : hold;
    if (face !== 'calm') this.jolt = 10;                                                 // the set rocks a little on the desk
    const L = this.lines(line); if (L) { this.sayClean = L[Math.floor(Math.random() * L.length)]; this.saying = this.noli ? glitchLine(this.sayClean) : this.sayClean; this.sayT = hold + 40; }
    if (this.noli && NOLI_VOICE[line]) this.noliVoice(NOLI_VOICE[line]);
  }
  // NOLI talks: one of his glitchy sounds (a new one cuts off the last; the little blip waits its turn)
  noliVoice(k) {
    const key = 'noli_v_' + k + '_' + Math.floor(Math.random() * (NOLI_MOODS[k] || 1));
    if (!this.cache.audio.exists(key) || this.t < (this.hushUntil || 0)) return;   // (quiet while the NOLI clip plays)
    this.nextMutter = this.t + NOLI_MUTTER[0] + Math.floor(Math.random() * (NOLI_MUTTER[1] - NOLI_MUTTER[0]));
    if (this.voice && this.voice.isPlaying) { if (k === 'blip') return; this.voice.stop(); }
    if (this.voice) this.voice.destroy();
    this.voice = this.sound.add(key); this.voice.play({ volume: 0.85 * settings.sfxVolume, rate: 0.96 + Math.random() * 0.08 });
  }
  // him: an old CRT TV with rabbit-ear antennas, sitting on a wooden desk, Mason's faces on the screen
  keeper(g, t) {
    const floor = 206, desk = 172, hx = KP.x;
    const jolt = this.jolt > 0 ? this.jolt-- : 0, rock = jolt ? Math.round(Math.sin(jolt * 1.4) * jolt * 0.25) : 0;
    const hop = this.face === 'shock' && jolt > 4 ? -2 : 0, hy = KP.y + hop;
    // his nook: a back wall, a shelf of junk, the floor
    const rh = this.riphood, sv = this.soviet;
    g.fillStyle(rh ? 0x26261a : sv ? 0x2a0a0e : 0x140a20, 1); g.fillRect(SIDE.x, 44, SIDE.w, floor - 42);
    g.fillStyle(rh ? 0x4a3a24 : sv ? 0x6a3a1c : 0x221432, 1); g.fillRect(SIDE.x, 64, SIDE.w, 3); g.fillRect(SIDE.x, 118, SIDE.w, 3);
    if (sv) this.sovietNook(g, t); else if (this.decor) this.decor.forEach((o) => o.setVisible(false));
    // the shelves behind him: junk - or, in the depot, ammo boxes, a jerrycan, a canteen, a spare helmet
    if (!sv) for (const [x, y, w, h, c] of rh ? [[432, 52, 16, 12, 0x4a5424], [450, 56, 10, 8, 0x5e6a2e], [590, 46, 12, 18, 0x5a6a2a], [606, 54, 12, 10, 0x6a5a3a], [432, 104, 18, 14, 0x4a5424], [600, 100, 18, 18, 0x3a4220]] : [[432, 50, 14, 14, 0x5a3a8a], [450, 54, 10, 10, 0xc77dff], [590, 48, 16, 16, 0x3a8a6a], [608, 56, 10, 8, 0xf3c358], [432, 102, 18, 16, 0x8a3a5a], [600, 98, 18, 20, 0x3a5a8a]]) { g.fillStyle(c, rh ? 1 : 0.8); g.fillRect(x, y, w, h); if (rh) { g.fillStyle(0x000000, 0.25); g.fillRect(x, y + h / 2, w, 1); } }
    if (rh) { g.fillStyle(0x4a5424, 1); g.fillEllipse(456, 116, 22, 12); g.fillStyle(0x5e6a2e, 1); g.fillEllipse(454, 113, 14, 6); g.fillStyle(0x2e3516, 1); g.fillRect(444, 116, 24, 2);   // a spare helmet on the shelf
      g.fillStyle(0xd8d0a8, 0.8); g.fillRect(435, 108, 2, 3); g.fillRect(438, 108, 2, 3); g.fillRect(603, 106, 2, 3); g.fillRect(606, 106, 2, 3); }   // stencilled numbers
    g.fillStyle(rh ? 0x4a3a24 : 0x221432, 1); g.fillRect(SIDE.x, floor, SIDE.w, 2);
    // the desk: a wooden top, a drawer with a brass handle, two legs - and a little bell
    g.fillStyle(0x000000, 0.35); g.fillEllipse(hx, floor, 150, 6);
    g.fillStyle(0x4a2a1a, 1); g.fillRect(hx - 72, desk, 144, 10); g.fillStyle(0x6a3e24, 1); g.fillRect(hx - 72, desk, 144, 3);
    g.fillStyle(0x3a2014, 1); g.fillRect(hx - 66, desk + 10, 8, floor - desk - 10); g.fillRect(hx + 58, desk + 10, 8, floor - desk - 10);
    g.fillStyle(0x4a2a1a, 1); g.fillRect(hx - 40, desk + 10, 80, 14); g.fillStyle(0xc8a040, 1); g.fillRect(hx - 6, desk + 16, 12, 2);
    const bw = this.bellWobble > 0 ? Math.round(Math.sin(this.bellWobble-- * 1.3) * this.bellWobble * 0.15) : 0;   // the bell: rocks when rung (ring it 3 times...)
    g.fillStyle(0xc8a040, 1); g.fillEllipse(hx + 58 + bw, desk - 4, 14, 8); g.fillStyle(0xe8c060, 1); g.fillRect(hx + 57 + bw * 2, desk - 11, 2, 4); g.fillRect(hx + 52, desk - 1, 12, 2);
    // the TV: casing, a screen in a rounded bezel, knobs, a grille, little feet, rabbit-ear antennas
    const tx = hx + rock;
    if (this.playing && this.playing.S.tv === '90s') this.tv90s(g, tx, hy, t, rock, desk); else if (this.riphood) this.fieldSet(g, tx, hy, t, rock, desk); else {
    g.fillStyle(0x2a2632, 1); g.fillRect(tx - 36, desk - 4, 10, 4); g.fillRect(tx + 26, desk - 4, 10, 4);
    g.lineStyle(2, 0x8a8a9a, 1); g.lineBetween(tx - 10, hy - 40, tx - 28 - rock, hy - 62); g.lineBetween(tx + 10, hy - 40, tx + 26 - rock, hy - 64);
    g.fillStyle((t >> 4) % 2 ? 0xff5a5a : 0x8a2a2a, 1); g.fillCircle(tx - 28 - rock, hy - 62, 3); g.fillCircle(tx + 26 - rock, hy - 64, 3);
    g.fillStyle(0x6a6478, 1); g.fillRoundedRect(tx - 46, hy - 40, 92, 80, 10); g.fillStyle(0x837d92, 1); g.fillRoundedRect(tx - 46, hy - 40, 92, 6, 3);
    g.fillStyle(0x2a2632, 1); g.fillRoundedRect(tx - 42, hy - 36, 76, 72, 8);
    g.fillStyle(0x061a14, 1); g.fillRoundedRect(tx - 40, hy - 34, 72, 68, 7);
    this.glow(g, tx - 4, hy, 38, this.noli ? 0xb06aff : this.soviet ? 0xff5a3a : 0x5affb8, 0.18);
    for (let i = 0; i < 2; i++) { g.fillStyle(0x2a2632, 1); g.fillCircle(tx + 39, hy - 22 + i * 16, 4); g.fillStyle(0x9a94a8, 1); g.fillRect(tx + 38, hy - 26 + i * 16 + ((t >> 5) + i) % 3, 2, 4); }
    for (let i = 0; i < 4; i++) { g.fillStyle(0x2a2632, 1); g.fillRect(tx + 35, hy + 10 + i * 5, 8, 2); }
    g.fillStyle((t >> 5) % 2 ? 0x5aff8a : 0x2a8a4a, 1); g.fillRect(tx + 37, hy + 32, 3, 2);                     // the power light
    if (this.soviet) this.ushanka(g, tx, hy, t, rock, desk);
    }
    // the face on the screen: the current face's strip, animated if it has more than one frame
    const fc = this.noli ? 'noli' : this.soviet ? 'sickle' : this.face, key = 'shop_face_' + fc, F = KEEPER.faces[fc], n = Math.max(1, this.textures.get(key).frameTotal - 1);
    // ...and alive: every face moves a little in its own way (see faceMotion)
    const [mx, my, msx, msy] = this.faceMotion(t);
    const gx = this.noli && Math.random() < 0.03 ? Math.round((Math.random() - 0.5) * 6) : 0;                 // NOLI: his face skips sideways now and then
    this.faceImg.setTexture(key, Math.floor((t - this.faceStart) * F.fps / 60) % n).setPosition(Math.round(tx - 4 + mx + gx), Math.round(hy + my)).setScale(msx, msy).setVisible(this.static <= 0 || this.static % 2 === 0)
      .setTintMode(fc === 'sickle' ? Phaser.TintModes.MULTIPLY : Phaser.TintModes.FILL).setTint(this.noli ? NOLI.tint : this.riphood ? WW2.amber : fc === 'sickle' ? 0xffffff : 0x9affd8);
    const f = this.front; f.clear();
    for (let y = hy - 34; y < hy + 34; y += 2) { f.fillStyle(0x000000, 0.22); f.fillRect(tx - 40, y, 72, 1); }        // scanlines
    f.fillStyle(0xffffff, 0.06); f.fillEllipse(tx - 18, hy - 20, 32, 12);                                          // the glass
    if (this.playing && !this.secret) { this.faceImg.setVisible(false); this.vidImg.setVisible(true).setPosition(tx - 4, hy); this.drawPlaying(t); }
    if (this.secret) this.drawSecret(f, tx - 4, hy, t);
    if (this.call > 0) {                                                                                       // 13: his screen goes black; a doll's face looks out; a red 13
      this.call--; this.faceImg.setVisible(false);
      const cx = tx - 4, k = this.call;
      f.fillStyle(0x020204, 1); f.fillRect(cx - 36, hy - 32, 72, 64);
      const a = k > 120 ? (150 - k) / 30 : k < 30 ? k / 30 : 1, wob = Math.sin(t * 0.07) * 2;
      if (k < 140) {
        f.fillStyle(0x1e2a1a, a); f.fillRect(cx - 18 + wob, hy + 14, 36, 18);                                  // the slicker's collar
        f.fillStyle(0xf0e8e0, a); f.fillEllipse(cx + wob, hy + 2, 22, 26);                                     // the doll's face
        f.fillStyle(0xe88a9a, a * 0.85); f.fillCircle(cx - 6 + wob, hy + 5, 2.5); f.fillCircle(cx + 6 + wob, hy + 5, 2.5);   // rosy cheeks
        f.fillStyle(0x020204, a); f.fillCircle(cx - 4 + wob, hy - 1, 2.2); f.fillCircle(cx + 4 + wob, hy - 1, 2.2);
        f.fillStyle(0xc8202a, a); f.fillRect(cx - 2 + wob, hy + 9, 4, 1);                                      // the painted smile
        f.lineStyle(1, 0xc0b4a8, a); f.lineBetween(cx + 3 + wob, hy - 11, cx + wob, hy - 1); f.lineBetween(cx + wob, hy - 1, cx + 2 + wob, hy + 4);   // the crack
        f.fillStyle(0x161e12, a); f.fillRect(cx - 20 + wob, hy - 12, 40, 4); f.fillEllipse(cx + wob, hy - 15, 24, 10);   // the rain hat
      }
      if (k < 60 && t % 20 < 14) this.digits(f, cx + 24, hy - 24, '13', 2);
      if (k < 60) { f.fillStyle(0xd8202a, 0.35); f.fillRect(cx - 36, hy - 32, 72, 64); }
    }
    if (this.static > 0) { this.static--; for (let i = 0; i < 70; i++) { f.fillStyle(Math.random() < 0.5 ? 0xd8fff0 : 0x2a4a3a, 1); f.fillRect(tx - 40 + Math.random() * 70, hy - 34 + Math.random() * 66, 2, 1); } }   // static when the channel changes
    if (this.face === 'shock' && this.faceT > KEEPER.hold - 24) { const d = KEEPER.hold - this.faceT; f.lineStyle(2, 0xffffff, 1 - d / 24); for (const s of [-1, 1]) { f.lineBetween(tx + s * 52, hy - 30, tx + s * 60, hy - 38); f.lineBetween(tx + s * 54, hy - 18, tx + s * 64, hy - 20); } }   // !! lines
    if (this.face === 'money' && this.faceT > 0) for (let i = 0; i < 4; i++) { const p = ((t + i * 15) % 60) / 60; f.fillStyle(0xf3c358, 1 - p); f.fillRect(tx - 30 + i * 20, hy - 44 - p * 24, 3, 3); }   // coins of light, floating up
    // the speech bubble
    if (this.sayT > 0 && this.saying) {
      this.sayT--;
      if (this.noli && this.sayClean && this.sayT % NOLI.rescramble === 0) this.saying = glitchLine(this.sayClean);   // NOLI: the words won't hold still
      this.bubbleT.setText(this.saying).setVisible(true);
      const bw = Math.max(80, this.bubbleT.width + 16), bh = 20, bx = Math.min(W - bw - 70, hx - 64 - bw / 2), by = 14;
      f.fillStyle(0xf4f0fa, 1); f.fillRoundedRect(bx, by, bw, bh, 6); f.fillTriangle(bx + bw - 26, by + bh, bx + bw - 12, by + bh, tx - 30, hy - 44);
      this.bubbleT.setPosition(bx + bw / 2, by + bh / 2);
    } else this.bubbleT.setVisible(false);
  }
  // RIPHOOD: an olive-drab field set - a riveted steel case with a canvas strap, big tuning dials and a toggle, a handset
  // hanging off the side on its coiled cord, a whip antenna swaying, a steel helmet tipped on top, a stencilled number,
  // and an amber screen (the screen stays in the same spot, so his face fits)
  fieldSet(g, tx, hy, t, rock, desk) {
    g.fillStyle(0x1e2010, 1); g.fillRect(tx - 44, desk - 4, 12, 4); g.fillRect(tx + 30, desk - 4, 12, 4);   // feet
    const wa = Math.sin(t * 0.05) * 3 - rock; g.lineStyle(1, 0x2a2a1a, 1); g.lineBetween(tx + 34, hy - 40, tx + 44 + wa, hy - 92); g.fillStyle(0x2a2a1a, 1); g.fillCircle(tx + 44 + wa, hy - 92, 1.5);   // the whip antenna
    g.fillStyle(0x3a4220, 1); g.fillRoundedRect(tx - 50, hy - 42, 96, desk - hy + 40, 5);                  // the steel case
    g.fillStyle(0x4e5a2c, 1); g.fillRoundedRect(tx - 50, hy - 42, 96, 5, 3);
    g.fillStyle(0x2a3016, 1); g.fillRect(tx - 50, hy + 38, 96, 2);
    for (const [x, y] of [[-47, -39], [43, -39], [-47, 36], [43, 36], [-47, 0], [43, 0]]) { g.fillStyle(0x6a7438, 1); g.fillCircle(tx + x, hy + y, 1.3); }   // rivets
    g.fillStyle(0x6a5a3a, 1); g.fillRect(tx - 30, hy - 46, 4, 6); g.fillRect(tx + 22, hy - 46, 4, 6); g.fillRect(tx - 30, hy - 48, 56, 3);   // the canvas carrying strap
    g.fillStyle(0x1c1e0e, 1); g.fillRoundedRect(tx - 43, hy - 37, 78, 74, 6);                              // the bezel
    g.fillStyle(0x1a1206, 1); g.fillRoundedRect(tx - 40, hy - 34, 72, 68, 6);                              // the amber screen
    this.glow(g, tx - 4, hy, 38, WW2.amber, 0.14);
    for (let i = 0; i < 2; i++) { const a = t * 0.01 * (i ? -1 : 1) + i; g.fillStyle(0x1c1e0e, 1); g.fillCircle(tx + 40, hy - 20 + i * 18, 5); g.fillStyle(0x8a8a6a, 1); g.fillCircle(tx + 40, hy - 20 + i * 18, 3.5); g.lineStyle(1, 0x1c1e0e, 1); g.lineBetween(tx + 40, hy - 20 + i * 18, tx + 40 + Math.cos(a) * 3, hy - 20 + i * 18 + Math.sin(a) * 3); }   // tuning dials
    g.fillStyle(0x8a8a6a, 1); g.fillRect(tx + 38, hy + 12, 4, 6); g.fillStyle(0x1c1e0e, 1); g.fillRect(tx + 39, hy + (((t >> 6) % 2) ? 12 : 15), 2, 3);   // a toggle switch
    g.fillStyle((t >> 5) % 2 ? 0xffb040 : 0x6a4010, 1); g.fillRect(tx + 38, hy + 28, 4, 3);                // the power lamp
    g.fillStyle(0xd8d0a8, 0.85); for (const [x, y, w, h] of [[-40, 40, 2, 4], [-37, 40, 3, 1], [-37, 42, 3, 1], [-37, 44, 3, 1], [-32, 40, 3, 4]]) g.fillRect(tx + x, hy + y, w, h);   // a stencilled 15
    // the handset, hanging on the left on its coiled cord
    g.lineStyle(1, 0x1a1a10, 1); for (let i = 0; i < 6; i++) g.strokeCircle(tx - 54, hy - 4 + i * 4, 2);
    g.fillStyle(0x1e1e14, 1); g.fillRoundedRect(tx - 60, hy + 18, 10, 26, 3); g.fillRect(tx - 62, hy + 18, 14, 5); g.fillRect(tx - 62, hy + 39, 14, 5);
    // a steel helmet tipped on the top corner
    const hx2 = tx - 22 - rock, hy2 = hy - 46;
    g.fillStyle(0x1e2210, 1); g.fillEllipse(hx2, hy2 + 1, 34, 8);
    g.fillStyle(0x4a5424, 1); g.slice(hx2, hy2, 14, Math.PI, 0, false); g.fillPath(); g.fillStyle(0x667232, 1); g.slice(hx2 - 3, hy2 - 2, 8, Math.PI, Math.PI * 1.6, false); g.fillPath();
    g.fillStyle(0x2e3516, 1); for (let i = 0; i < 5; i++) g.fillRect(hx2 - 10 + i * 5, hy2 - 8 + Math.abs(i - 2) * 2, 1, 1);   // netting
    g.fillStyle(0x3a4a1c, 1); g.fillRect(hx2 - 16, hy2, 32, 2);
  }
  // PAPERSPLEASE: a deep winter fur hat on his set - a fur crown, the front flap turned up with a red star on it, the ear
  // flaps hanging down his sides, their ties swinging - and on the desk beside him an old valve radio blasting the
  // anthem, a little red flag on a stick poking out of its top
  ushanka(g, tx, hy, t, rock, desk) {
    const FUR = [0x3a2a1e, 0x5a4230, 0x7a5c42, 0x9a7a5a], rnd = (i) => ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
    for (const s of [-1, 1]) {                                                            // the ear flaps
      const x = tx - 2 + s * 46, sw = Math.sin(t * 0.06 + s) * 1.5;
      g.fillStyle(FUR[1], 1); g.fillRoundedRect(x - 6, hy - 44, 12, 34, 4); g.fillStyle(FUR[2], 1); g.fillRect(x - 5, hy - 42, 4, 28);
      g.lineStyle(1, 0x2a1e14, 1); g.lineBetween(x, hy - 10, x + sw, hy + 4); g.fillStyle(FUR[0], 1); g.fillCircle(x + sw, hy + 5, 1.5);
    }
    g.fillStyle(FUR[0], 1); g.fillEllipse(tx - 2, hy - 50, 86, 30);                      // the crown
    g.fillStyle(FUR[1], 1); g.fillEllipse(tx - 2, hy - 52, 80, 26);
    g.fillStyle(FUR[2], 1); g.fillEllipse(tx - 8, hy - 56, 50, 12);
    for (let i = 0; i < 70; i++) { g.fillStyle(FUR[(i % 3) + 1], 1); g.fillRect(tx - 40 + rnd(i) * 76, hy - 62 + rnd(i + 99) * 22, 1, 2); }   // fur
    g.fillStyle(FUR[2], 1); g.fillRoundedRect(tx - 44, hy - 46, 84, 10, 4); g.fillStyle(FUR[3], 1); g.fillRect(tx - 40, hy - 45, 76, 2);   // the front flap, turned up
    for (let i = 0; i < 30; i++) { g.fillStyle(FUR[i % 2 ? 1 : 3], 1); g.fillRect(tx - 42 + rnd(i + 7) * 80, hy - 45 + rnd(i + 31) * 8, 1, 1); }
    const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2.4 : 6; pts.push({ x: tx - 2 + Math.cos(a) * r, y: hy - 42 + Math.sin(a) * r }); }
    g.fillStyle(0xffd040, 1); g.fillCircle(tx - 2, hy - 42, 7); g.fillStyle(0xd81e1e, 1); g.fillPoints(pts, true);   // the star badge
    // the radio
    const R = USSR.radio, rx = tx + R.dx, ry = desk - R.h, beat = (t % 28) < 4;
    g.fillStyle(0x3a1e0c, 1); g.fillRoundedRect(rx - R.w / 2 - 1, ry - 7, R.w + 2, R.h + 7, 8);
    g.fillStyle(0x6a3a1c, 1); g.fillRoundedRect(rx - R.w / 2, ry - 6, R.w, R.h + 6, 7); g.fillStyle(0x8a5228, 1); g.fillRect(rx - R.w / 2 + 2, ry - 4, R.w - 4, 2);
    g.fillStyle(0xc8a46a, 1); g.fillCircle(rx - 4, ry + 6, beat ? 7 : 6.5);                // the speaker, thumping
    g.lineStyle(1, 0x8a6a3a, 1); for (let i = -2; i <= 2; i++) g.lineBetween(rx - 9, ry + 6 + i * 2, rx + 1, ry + 6 + i * 2);
    g.fillStyle(0x1a1008, 1); g.fillRect(rx + 5, ry + 1, 6, 4); g.fillStyle(0xffd040, (t >> 3) % 2 ? 1 : 0.6); g.fillRect(rx + 7, ry + 2, 1, 2);   // the dial
    g.fillStyle(0x2a1a0c, 1); g.fillCircle(rx + 6, ry + 10, 2); g.fillCircle(rx + 10, ry + 10, 2);
    g.lineStyle(1, 0xc8962a, 1); g.lineBetween(rx + 8, ry - 6, rx + 8, ry - 24);             // the little flag on its stick
    const fp = []; for (let i = 0; i <= 4; i++) fp.push({ x: rx + 8 + i * 3, y: ry - 24 + Math.sin(t * 0.2 - i) * 1.2 * i / 4 });
    for (let i = 4; i >= 0; i--) fp.push({ x: rx + 8 + i * 3, y: ry - 16 + Math.sin(t * 0.2 - i) * 1.2 * i / 4 });
    g.fillStyle(0xd81e1e, 1); g.fillPoints(fp, true); g.fillStyle(0xffd040, 1); g.fillRect(rx + 10, ry - 22, 2, 2);
    for (let i = 0; i < 3; i++) { const p = ((t + i * 9) % 28) / 28; g.lineStyle(1, 0xffd040, 0.7 * (1 - p)); g.beginPath(); g.arc(rx - 4, ry + 6, 9 + p * 16, Math.PI * 0.7, Math.PI * 1.3); g.strokePath(); }   // the anthem, blasting out
  }
  // PAPERSPLEASE: his nook - red banners in the top corners, the OUR VICTORY poster (once earned), and things from other
  // countries on his shelf (click them: EGGS)
  sovietNook(g, t) {
    if (!this.decor) this.decor = [this.add.image(0, 0, 'shop_flag_emblem').setOrigin(0), this.add.image(0, 0, 'shop_flag_emblem').setOrigin(0), this.add.image(584, 70, 'shop_poster').setScale(0.2)];
    const [e1, e2, po] = this.decor;
    for (const [x, k, e] of [[433, 0, e1], [602, 1, e2]]) {                                   // the banners, swaying
      const poly = [{ x, y: 46 }, { x: x + 16, y: 46 }, { x: x + 16 + Math.sin(t * 0.05 + 3 + k) * 1.5, y: 92 }, { x: x + 8 + Math.sin(t * 0.05 + 3 + k) * 1.5, y: 86 }, { x: x + Math.sin(t * 0.05 + 3 + k) * 1.5, y: 92 }];
      g.fillStyle(0xd81e1e, 1); g.fillPoints(poly, true); g.fillStyle(0xffd040, 1); g.fillRect(x, 46, 16, 2);
      e.setVisible(true).setPosition(x, 50).setDepth(1);
    }
    po.setVisible(isUnlocked('our-victory'));
    if (po.visible) { g.fillStyle(0x000000, 0.5); g.fillRect(573, 54, 26, 36); }
    // the shelf: things from other countries
    const S = 118;
    g.fillStyle(0xffffff, 1); g.fillEllipse(440, S - 6, 14, 11); g.fillRect(445, S - 9, 5, 2); g.fillStyle(0x2a4ab8, 1); g.fillRect(434, S - 7, 12, 2); g.fillStyle(0xd81e1e, 1); g.fillRect(434, S - 5, 12, 1); g.fillStyle(0xffffff, 1); g.fillRect(438, S - 13, 4, 2);   // a British teapot
    g.fillStyle(0xd8a050, 1); g.fillRect(452, S - 4, 20, 4); g.fillStyle(0xb8803a, 1); for (let i = 0; i < 4; i++) g.fillRect(455 + i * 4, S - 4, 2, 1);   // a French baguette...
    g.fillStyle(0x1a1a24, 1); g.fillEllipse(460, S - 7, 14, 6); g.fillRect(459, S - 11, 2, 2);                                                                  // ...and a beret on it
    g.fillStyle(0x0a0a10, 1); g.fillCircle(583, S - 8, 8); g.fillStyle(0x2a4ab8, 1); g.fillCircle(583, S - 8, 3); g.fillStyle(0xffffff, 1); g.fillCircle(583, S - 8, 1);   // an American jazz record
    g.fillStyle(0xffffff, 1); g.fillCircle(600, S - 6, 6); g.fillCircle(600, S - 13, 4.5); g.fillStyle(0x1a1a1a, 1); g.fillCircle(596, S - 16, 2); g.fillCircle(604, S - 16, 2); g.fillCircle(598, S - 13, 1.2); g.fillCircle(602, S - 13, 1.2); g.fillRect(595, S - 6, 10, 3);   // a panda from China
    g.fillStyle(0xe8e8f0, 1); g.fillEllipse(614, S - 2, 14, 4); g.fillStyle(0xf4d090, 1); for (const dx of [-4, 0, 4]) g.fillEllipse(614 + dx, S - 5, 5, 3);   // Polish pierogi on a plate
  }
  // the Backrooms secret turns him into a chunky 90s set: charcoal plastic, a speaker grille and buttons under the screen,
  // and a separate rabbit-ear antenna on top - long telescopic rods and a UHF loop (the screen stays in the same spot)
  tv90s(g, tx, hy, t, rock, desk) {
    g.fillStyle(0x16151a, 1); g.fillRect(tx - 44, desk - 4, 84, 4);                                  // the base
    g.fillStyle(0x2c2b32, 1); g.fillRoundedRect(tx - 50, hy - 42, 96, desk - hy + 40, 6);           // the cabinet
    g.fillStyle(0x3a3942, 1); g.fillRoundedRect(tx - 50, hy - 42, 96, 5, 3);
    g.fillStyle(0x1a191e, 1); g.fillRoundedRect(tx - 44, hy - 38, 80, 76, 10);                      // the bezel
    g.fillStyle(0x061a14, 1); g.fillRoundedRect(tx - 40, hy - 34, 72, 68, 9);
    for (let i = 0; i < 9; i++) { g.fillStyle(0x16151a, 1); g.fillRect(tx - 40 + i * 6, desk - 14, 4, 1); g.fillRect(tx - 40 + i * 6, desk - 11, 4, 1); }   // speaker grille
    for (let i = 0; i < 4; i++) { g.fillStyle(0x4a4954, 1); g.fillRect(tx + 18 + i * 6, desk - 14, 4, 3); }   // buttons
    g.fillStyle((t >> 5) % 2 ? 0xff3a3a : 0x8a1a1a, 1); g.fillRect(tx + 40, desk - 13, 2, 2);         // power light
    // the antenna on top: a little dome, two long rods (with joints), a loop
    const ax = tx - 2 - rock, ay = hy - 42;
    g.fillStyle(0x1a191e, 1); g.fillEllipse(ax, ay - 2, 26, 8);
    g.lineStyle(1, 0xc8c8d0, 1); g.lineBetween(ax - 4, ay - 4, ax - 34, ay - 54); g.lineBetween(ax + 4, ay - 4, ax + 30, ay - 58);
    for (const [x, y] of [[ax - 14, ay - 21], [ax - 24, ay - 37], [ax + 13, ay - 23], [ax + 22, ay - 41]]) { g.fillStyle(0xe8e8f0, 1); g.fillRect(x - 1, y - 1, 2, 2); }
    g.fillStyle(0xe8e8f0, 1); g.fillCircle(ax - 34, ay - 54, 1.5); g.fillCircle(ax + 30, ay - 58, 1.5);
    g.lineStyle(2, 0x9a9aa6, 1); g.strokeCircle(ax, ay - 12, 8);
  }
  // a gacha machine: a glass globe of coloured capsules on a base in the machine's colour, a coin slot, a crank that
  // turns, the prize chute - and a badge for the 10-pull bundles (or a ? for the mystery one)
  machine(g, cx, cy, s, it, t) {
    if (it.gacha.machine === 'supply') return this.supplyDrop(g, cx, cy, s, it, t);
    const col = it.color ?? C.gold, k = s / 16, R = 11 * k, gy = cy - 5 * k;
    g.fillStyle(0x1a1424, 1); g.fillRect(cx - 12 * k, cy + 4 * k, 24 * k, 13 * k);          // the base
    g.fillStyle(col, 1); g.fillRect(cx - 11 * k, cy + 5 * k, 22 * k, 11 * k);
    g.fillStyle(0xffffff, 0.3); g.fillRect(cx - 11 * k, cy + 5 * k, 22 * k, 2 * k);
    g.fillStyle(0x1a1424, 1); g.fillRect(cx - 4 * k, cy + 11 * k, 8 * k, 4 * k); g.fillRect(cx + 5 * k, cy + 7 * k, 3 * k, 1 * k);   // the chute, the coin slot
    const a = t * 0.05; g.lineStyle(Math.max(1, k * 1.5), 0xe8e4f4, 1); g.lineBetween(cx - 6 * k, cy + 9 * k, cx - 6 * k + Math.cos(a) * 3 * k, cy + 9 * k + Math.sin(a) * 3 * k);   // the crank
    g.fillStyle(0x1a1424, 1); g.fillCircle(cx, gy, R + 1);                                   // the globe...
    g.fillStyle(0x2a3a5a, 0.6); g.fillCircle(cx, gy, R);
    const caps = [0xff5a6a, 0x5ad0ff, 0xf3c358, 0x7aff8a, 0xc77dff, 0xff9a3a, 0xffffff];
    for (let i = 0; i < 9; i++) {                                                            // ...full of capsules, jostling
      const px = cx + ((i % 3) - 1) * 6 * k + Math.sin(t * 0.08 + i) * 0.6 * k, py = gy + 4 * k - Math.floor(i / 3) * 5 * k + Math.cos(t * 0.07 + i) * 0.5 * k;
      g.fillStyle(caps[(i * 3 + (it.gacha.machine === 'golden' ? 2 : 0)) % caps.length], 1); g.fillCircle(px, py, 2.6 * k); g.fillStyle(0xffffff, 0.8); g.fillRect(px - 2.6 * k, py - 0.3 * k, 5.2 * k, 0.8 * k);
    }
    g.fillStyle(0xffffff, 0.35); g.fillEllipse(cx - 4 * k, gy - 5 * k, 6 * k, 3 * k);       // the glass shine
    g.fillStyle(col, 1); g.fillRect(cx - 3 * k, gy - R - 2 * k, 6 * k, 3 * k);               // the cap on top
    if (it.gacha.pulls > 1) { g.fillStyle(0xd8223a, 1); g.fillCircle(cx + 10 * k, gy - 8 * k, 4.5 * k); this.digits(g, cx + 10 * k, gy - 8 * k, String(it.gacha.pulls), Math.max(1, k * 0.8)); }   // a badge: how many pulls
    if (it.gacha.machine === 'mystery') { g.fillStyle(0x1a1424, 0.8); g.fillCircle(cx, gy, R); g.fillStyle(0xc77dff, 1); g.fillRect(cx - 3 * k, gy - 6 * k, 6 * k, 2 * k); g.fillRect(cx + 2 * k, gy - 5 * k, 2 * k, 4 * k); g.fillRect(cx - 1 * k, gy - 1 * k, 3 * k, 2 * k); g.fillRect(cx - 1 * k, gy + 3 * k, 2 * k, 2 * k); }   // a ? over a dark globe
  }
  // the SUPPLY DROP: an olive crate floating down under a khaki parachute, swaying
  supplyDrop(g, cx, cy, s, it, t) {
    const k = s / 16, sw = Math.sin(t * 0.05) * 2 * k, y0 = cy - 14 * k + Math.sin(t * 0.03) * k;
    g.fillStyle(0x8a7a4a, 1); g.slice(cx + sw, y0, 12 * k, Math.PI, 0, false); g.fillPath();             // the canopy
    g.fillStyle(0xa8986a, 1); g.slice(cx + sw - 3 * k, y0 - k, 6 * k, Math.PI, Math.PI * 1.7, false); g.fillPath();
    g.fillStyle(0x5a4c2a, 1); for (let i = -2; i <= 2; i++) g.fillRect(cx + sw + i * 4.5 * k - 0.5 * k, y0 - (2 - Math.abs(i)) * 2.5 * k - 2 * k, Math.max(1, k), 2 * k);   // its seams
    g.lineStyle(1, 0xd8d0a8, 0.8); for (const d of [-11, -4, 4, 11]) g.lineBetween(cx + sw + d * k, y0, cx + d * 0.3 * k, cy + 4 * k);   // the lines
    const by = cy + 4 * k;
    g.fillStyle(0x2e3516, 1); g.fillRect(cx - 8 * k, by, 16 * k, 12 * k);                                // the crate
    g.fillStyle(0x4a5424, 1); g.fillRect(cx - 7 * k, by + k, 14 * k, 10 * k);
    g.fillStyle(0x2e3516, 1); g.fillRect(cx - 7 * k, by + 5.5 * k, 14 * k, k); g.fillRect(cx - 0.5 * k, by + k, k, 10 * k);
    g.fillStyle(0xd8d0a8, 0.85); g.fillRect(cx - 5 * k, by + 2 * k, 3 * k, Math.max(1, 0.7 * k)); g.fillRect(cx + 2 * k, by + 7 * k, 3 * k, Math.max(1, 0.7 * k));   // stencil marks
  }
  // little 3x5 pixel digits, centred on x, y
  digits(g, x, y, str, s) {
    const F = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001001001', 8: '111101111101111', 9: '111101111001111' };
    const w = str.length * 4 * s - s; g.fillStyle(0xffffff, 1);
    [...str].forEach((d, i) => { for (let p = 0; p < 15; p++) if (F[d][p] === '1') g.fillRect(x - w / 2 + i * 4 * s + (p % 3) * s, y - 2.5 * s + Math.floor(p / 3) * s, s, s); });
  }
  // how his face moves on the screen: [x, y, x scale, y scale]
  //   calm  drifts slowly up and down, and now and then blinks (the face squashes flat for a moment)
  //   happy bobs along to a little beat, swaying side to side
  //   money hops up and down fast, excited, with a jitter
  //   shock shakes, hard at first, then trembling
//   smug  leans slowly side to side, pleased with itself, with a little lift now and then
  faceMotion(t) {
    const d = t - this.faceStart;
    switch (this.face) {
      case 'happy': { const b = Math.abs(Math.sin(d * 0.12)); return [Math.sin(d * 0.06) * 1.5, -b * 3, 1, 1]; }
      case 'money': { const h = Math.abs(Math.sin(d * 0.22)); return [(d % 6 < 3 ? 1 : -1), -h * 2.5, 1, 1]; }
      case 'shock': { const a = d < 20 ? 3 : 1; return [(Math.random() - 0.5) * 2 * a, (Math.random() - 0.5) * a, 1, 1]; }
      case 'smug': { const brow = (d % 100) < 10 ? -1.5 : 0; return [Math.sin(d * 0.03) * 2.5, brow, 1, 1]; }      // smug: a slow, knowing sway, now and then a little lift
      default: { const blink = (t % 210) < 6 ? 0.15 : 1; return [Math.sin(t * 0.021) * 1, Math.sin(t * 0.035) * 1.5, 1, blink]; }
    }
  }
  glow(g, x, y, r, col, a) { for (let i = 1; i <= 5; i++) { g.fillStyle(col, a / 5); g.fillCircle(x, y, r * (1.15 - i * 0.17)); } }

  // a placeholder icon: a little gift box in the item's colour (or an empty, dashed slot)
  icon(g, cx, cy, s, it, t) {
    if (it && it.gacha && it.img) {                                         // a nesting doll (sprite in update) on a glow, a badge saying how many dolls deep
      const k = (Math.sin(t * 0.05) + 1) / 2; for (let i = 5; i > 0; i--) { g.fillStyle(it.color ?? C.gold, 0.05 + k * 0.03); g.fillCircle(cx, cy, 10 + i * 5); }
      if (it.gacha.pulls > 1) { g.fillStyle(0xd8223a, 1); g.fillCircle(cx + 22, cy - 18, 7); this.digits(g, cx + 22, cy - 18, String(it.gacha.pulls), 1); }
      return;
    }
    if (it && it.gacha) return this.machine(g, cx, cy, s, it, t);
    if (!it) {                                                                           // an empty slot: a dashed square and a ?
      g.fillStyle(C.dim, 1);
      for (let d = -s; d < s; d += 6) { g.fillRect(cx + d, cy - s, 3, 1); g.fillRect(cx + d, cy + s, 3, 1); g.fillRect(cx - s, cy + d, 1, 3); g.fillRect(cx + s, cy + d, 1, 3); }
      g.fillRect(cx - 4, cy - 8, 8, 2); g.fillRect(cx + 3, cy - 7, 2, 5); g.fillRect(cx - 1, cy - 3, 4, 2); g.fillRect(cx - 1, cy - 2, 2, 4); g.fillRect(cx - 1, cy + 4, 2, 2);
      return;
    }
    if (it.kind === 'costume') return;                                                  // (a sprite: drawn in update)
    if (it.img) { const k = (Math.sin(t * 0.05) + 1) / 2; for (let i = 5; i > 0; i--) { g.fillStyle(it.color ?? C.gold, 0.05 + k * 0.03); g.fillCircle(cx, cy, 10 + i * 5); } return; }   // an image (sprite in update) glowing
    if (it.kind === 'music') return this.vinyl(g, cx, cy, s, it, t);
    if (it.kind === 'fx') return this.scenery(g, cx, cy, it, t);
    if (it.kind === 'extra') return this.glyph(g, cx, cy, it, t);
    const col = it.color ?? C.gold, bob = Math.sin(t * 0.06) * 2;
    g.fillStyle(col, 1); g.fillRect(cx - s * 0.7, cy - s * 0.3 + bob, s * 1.4, s);
    g.fillStyle(0xffffff, 0.25); g.fillRect(cx - s * 0.7, cy - s * 0.3 + bob, s * 1.4, 3);
    g.fillStyle(0xffffff, 1); g.fillRect(cx - 2, cy - s * 0.3 + bob, 4, s); g.fillRect(cx - s * 0.8, cy - s * 0.45 + bob, s * 1.6, 5);
    g.fillEllipse(cx - 6, cy - s * 0.55 + bob, 10, 6); g.fillEllipse(cx + 6, cy - s * 0.55 + bob, 10, 6);
  }
  // a record spinning on a little turntable, its label in the track's colour
  vinyl(g, cx, cy, s, it, t) {
    if (it.rgb) return this.rgbVinyl(g, cx, cy, it, t);
    const col = it.color ?? C.gold, on = owns(it.id) && isEquipped('music', it.id), a = t * (on || it === this.item() ? 0.08 : 0.02);
    g.fillStyle(0x2a2030, 1); g.fillRect(cx - 26, cy - 22, 52, 46);
    g.fillStyle(0x0a0810, 1); g.fillCircle(cx - 3, cy + 1, 20);
    g.lineStyle(1, 0x2a2638, 1); for (const r of [17, 14, 11]) g.strokeCircle(cx - 3, cy + 1, r);
    g.fillStyle(0xffffff, 0.12); g.fillTriangle(cx - 3, cy + 1, cx - 3 + Math.cos(a) * 20, cy + 1 + Math.sin(a) * 20, cx - 3 + Math.cos(a + 0.5) * 20, cy + 1 + Math.sin(a + 0.5) * 20);   // the shine, going round
    g.fillStyle(col, 1); g.fillCircle(cx - 3, cy + 1, 7); g.fillStyle(0x0a0810, 1); g.fillCircle(cx - 3, cy + 1, 1.5);
    g.fillStyle(0xffffff, 0.8); g.fillCircle(cx - 3 + Math.cos(a * 2) * 4, cy + 1 + Math.sin(a * 2) * 4, 1);
    g.lineStyle(2, 0xb8b4c8, 1); g.lineBetween(cx + 21, cy - 18, cx + 19, cy + 2); g.lineBetween(cx + 19, cy + 2, cx + 9, cy + 8);   // the tone arm
    g.fillStyle(0xb8b4c8, 1); g.fillCircle(cx + 21, cy - 18, 3);
    if (on || it === this.item()) for (let i = 0; i < 2; i++) { const p = ((t + i * 30) % 60) / 60; g.fillStyle(col, 1 - p); g.fillRect(cx + 14 + i * 6, cy - 14 - p * 14, 3, 3); g.fillRect(cx + 16 + i * 6, cy - 22 - p * 14, 1, 9); }   // notes floating up
  }
  // an RGB record (items with `rgb`): a glowing halo and grooves cycling through the rainbow, a light-up label, spinning
  rgbVinyl(g, cx, cy, it, t) {
    const hsv = (h, s = 1, v = 1) => Phaser.Display.Color.HSVToRGB(((h % 1) + 1) % 1, s, v).color;
    const x = cx - 3, y = cy + 1, a = t * 0.09, h0 = t * 0.006;
    g.fillStyle(0x0a0614, 1); g.fillRect(cx - 26, cy - 22, 52, 46);
    for (let i = 6; i >= 1; i--) { g.fillStyle(hsv(h0 + i * 0.05), 0.07); g.fillCircle(x, y, 20 + i * 1.15); }      // the glow round it
    g.fillStyle(0x06040c, 1); g.fillCircle(x, y, 20);
    for (let k = 0; k < 6; k++) { g.lineStyle(1, hsv(h0 + k * 0.1, 0.9, 0.95), 0.85); g.strokeCircle(x, y, 18.5 - k * 1.7); }   // rainbow grooves
    for (let k = 0; k < 3; k++) { const b = a + k * 2.09; g.fillStyle(0xffffff, 0.16); g.fillTriangle(x, y, x + Math.cos(b) * 20, y + Math.sin(b) * 20, x + Math.cos(b + 0.35) * 20, y + Math.sin(b + 0.35) * 20); }   // light sweeping round
    for (let k = 0; k < 8; k++) { g.fillStyle(hsv(h0 + k / 8 + 0.5), 1); g.slice(x, y, 7, a + k * Math.PI / 4, a + (k + 1) * Math.PI / 4, false); g.fillPath(); }   // a spinning colour-wheel label
    g.fillStyle(0xffffff, 1); g.fillCircle(x, y, 2); g.fillStyle(0x06040c, 1); g.fillCircle(x, y, 1);
    g.lineStyle(2, 0xd8d4e8, 1); g.lineBetween(cx + 21, cy - 18, cx + 19, cy + 2); g.lineBetween(cx + 19, cy + 2, cx + 9, cy + 8);   // the tone arm
    g.fillStyle(0xd8d4e8, 1); g.fillCircle(cx + 21, cy - 18, 3);
    for (let i = 0; i < 2; i++) { const p = ((t + i * 30) % 60) / 60; g.fillStyle(hsv(h0 + i * 0.3), 1 - p); g.fillRect(cx + 14 + i * 6, cy - 14 - p * 14, 3, 3); g.fillRect(cx + 16 + i * 6, cy - 22 - p * 14, 1, 9); }   // notes
  }
  // a little window onto a stage with the effect on it: sky, a floating platform, the weather
  scenery(g, cx, cy, it, t) {
    const X = cx - 38, Y = cy - 27, w = 76, h = 54;
    const sky = { 'fx-night': 0x0a1440, 'fx-storm': 0x283044, 'fx-snow': 0x8aa0c0, 'fx-sakura': 0xf0b8c8, 'fx-fireflies': 0x2a1a4a, 'fx-bloodmoon': 0x3a0808, 'fx-sand': 0xc8945a, 'fx-aurora': 0x061830, 'fx-neon': 0x1a0830, 'fx-candy': 0xd8e0ff, 'fx-sunken': 0x1a5a90, 'fx-harvest': 0xd05a32, 'fx-front': 0x6a5a3a, 'fx-redsquare': 0x1a2248, 'fx-taiga': 0x8a9ab4, 'fx-whitenights': 0xe8c8d8 }[it.id] ?? 0x3a4a8a;
    g.fillStyle(sky, 1); g.fillRect(X, Y, w, h);
    const rnd = (i, k) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;
    switch (it.id) {
      case 'fx-night': for (let i = 0; i < 14; i++) { g.fillStyle(0xffffff, 0.4 + 0.6 * ((Math.sin(t * 0.1 + i * 3) + 1) / 2)); g.fillRect(X + rnd(i, 1) * w, Y + rnd(i, 2) * h * 0.6, 1, 1); }
        g.fillStyle(0xfff4c8, 1); g.fillCircle(X + 58, Y + 12, 6); g.fillStyle(sky, 1); g.fillCircle(X + 61, Y + 10, 5); break;
      case 'fx-storm': { if (t % 90 < 4) { g.fillStyle(0xffffff, 0.7); g.fillRect(X, Y, w, h); g.lineStyle(1, 0xffffff, 1); g.lineBetween(X + 50, Y, X + 46, Y + 14); g.lineBetween(X + 46, Y + 14, X + 52, Y + 20); g.lineBetween(X + 52, Y + 20, X + 47, Y + 34); }
        g.fillStyle(0x1a1e2a, 1); g.fillEllipse(X + 20, Y + 6, 40, 14); g.fillEllipse(X + 54, Y + 4, 44, 12);
        g.lineStyle(1, 0x8ab0ff, 0.7); for (let i = 0; i < 14; i++) { const x = X + ((rnd(i, 3) * w + t * 0.6) % w), y = Y + ((rnd(i, 4) * h + t * 2.5) % h); g.lineBetween(x, y, x - 2, y + 5); } break; }
      case 'fx-snow': g.fillStyle(0xffffff, 1); for (let i = 0; i < 18; i++) g.fillRect(X + ((rnd(i, 5) * w + t * 0.5) % w), Y + ((rnd(i, 6) * h + t * 0.4 * (1 + rnd(i, 7))) % h), 2, 2); break;
      case 'fx-sakura': for (let i = 0; i < 12; i++) { g.fillStyle(i % 2 ? 0xff7aa8 : 0xffd0e0, 1); g.fillRect(X + ((rnd(i, 8) * w + t * 0.3 + Math.sin(t * 0.05 + i) * 4) % w), Y + ((rnd(i, 9) * h + t * 0.3) % h), 3, 2); } break;
      case 'fx-fireflies': for (let i = 0; i < 10; i++) { const fx = X + 8 + rnd(i, 10) * (w - 16) + Math.sin(t * 0.03 + i * 2) * 5, fy = Y + 8 + rnd(i, 11) * (h - 22) + Math.cos(t * 0.025 + i) * 4, a = (Math.sin(t * 0.08 + i * 1.7) + 1) / 2; g.fillStyle(0xd8ff6a, 0.3 * a); g.fillCircle(fx, fy, 4); g.fillStyle(0xf4ffb0, 0.3 + 0.7 * a); g.fillRect(fx - 1, fy - 1, 2, 2); } break;
      case 'fx-bloodmoon': g.fillStyle(0xc81a1a, 0.25); g.fillCircle(X + 38, Y + 22, 22); g.fillStyle(0xd8261a, 1); g.fillCircle(X + 38, Y + 22, 15); g.fillStyle(0xa81010, 1); g.fillCircle(X + 32, Y + 18, 3); g.fillCircle(X + 43, Y + 27, 4); break;
      case 'fx-sand': for (let i = 0; i < 6; i++) { g.fillStyle(0xe8c088, 0.5); const sx = X + ((rnd(i, 12) * w + t * 2) % (w + 20)) - 20; g.fillRect(Math.max(X, sx), Y + rnd(i, 13) * h, Math.min(20, X + w - Math.max(X, sx)), 1); }
        g.fillStyle(0x6a4a2a, 1); for (let i = 0; i < 20; i++) g.fillRect(X + ((rnd(i, 14) * w + t * 2.2) % w), Y + rnd(i, 15) * h, 1, 1); break;
      case 'fx-neon': for (let i = 0; i < 6; i++) { g.fillStyle([0xffe05a, 0xffa05a, 0xff5a8a, 0xe02ac0, 0xb02ad0, 0x8a2ad8][i], 1); const hw = 14 - Math.abs(i - 1.5) * 2; g.fillRect(X + 38 - hw, Y + 10 + i * 4, hw * 2, 3); }   // striped sun over a grid
        g.fillStyle(0x0a0218, 1); g.fillRect(X, Y + 34, w, h - 34); g.lineStyle(1, 0xff3ad8, 0.8); for (let i = -4; i <= 4; i++) g.lineBetween(X + 38 + i * 5, Y + 34, X + 38 + i * 16, Y + h); g.lineBetween(X, Y + 34, X + w, Y + 34); g.lineBetween(X, Y + 38 + ((t >> 2) % 6), X + w, Y + 38 + ((t >> 2) % 6)); break;
      case 'fx-candy': for (const [x, c] of [[X + 12, 0xff8ab8], [X + 34, 0x8ae8c8], [X + 58, 0xb88aff]]) { g.fillStyle(c, 1); g.fillCircle(x, Y + 44, 12); }
        for (let i = 0; i < 10; i++) { g.fillStyle([0xff5a9a, 0x5ad8ff, 0xffe05a, 0x7aff8a][i % 4], 1); g.fillRect(X + ((rnd(i, 16) * w + Math.sin(t * 0.05 + i) * 3) % w), Y + ((rnd(i, 17) * h + t * 0.4) % h), 1, 3); }
        g.fillStyle(0xffffff, 1); g.fillEllipse(X + 20, Y + 10, 22, 7); for (let i = 0; i < 5; i++) { g.fillStyle(i % 2 ? 0xffffff : 0xe8203a, 1); g.fillRect(X + 64, Y + 22 + i * 4, 3, 4); } break;
      case 'fx-sunken': for (let i = 0; i < 3; i++) { g.fillStyle(0xd8f8ff, 0.12); g.fillTriangle(X + 6 + i * 24, Y, X + 16 + i * 24, Y, X + 30 + i * 24, Y + h); }
        g.fillStyle(0x0a2244, 1); g.fillRect(X + 10, Y + 18, 6, 26); g.fillRect(X + 56, Y + 24, 6, 20);
        for (let i = 0; i < 8; i++) { g.lineStyle(1, 0xd8f8ff, 0.8); g.strokeCircle(X + rnd(i, 18) * w, Y + h - ((rnd(i, 19) * h + t * 0.5) % h), 1 + (i % 2)); } break;
      case 'fx-harvest': g.fillStyle(0xffd070, 1); g.fillCircle(X + 20, Y + 16, 9); g.fillStyle(0x5a2a1a, 1); g.fillRect(X, Y + 36, w, h - 36);
        for (let i = 0; i < 9; i++) { g.fillStyle([0xc83a1a, 0xe8822a, 0xf4b83a][i % 3], 1); g.fillRect(X + ((rnd(i, 20) * w + t * 0.5 + Math.sin(t * 0.06 + i) * 4) % w), Y + ((rnd(i, 21) * h + t * 0.35) % h), 3, 2); }
        g.fillStyle(0xd86a1a, 1); g.fillEllipse(X + 54, Y + 38, 12, 9); g.fillStyle(0x3a6a2a, 1); g.fillRect(X + 53, Y + 32, 2, 3); break;
      case 'fx-taiga': {                                                                        // birches, a fir, a cabin with a lit window
        g.fillStyle(0xeef2f8, 1); g.fillRect(X, Y + 34, w, h - 34);
        for (const bx of [8, 20, 62]) { g.fillStyle(0xf4f2ea, 1); g.fillRect(X + bx, Y + 8, 3, 28); g.fillStyle(0x1a1a1a, 1); g.fillRect(X + bx, Y + 14, 2, 1); g.fillRect(X + bx + 1, Y + 24, 2, 1); }
        g.fillStyle(0x2e4a3e, 1); g.fillTriangle(X + 30, Y + 34, X + 44, Y + 34, X + 37, Y + 10);
        g.fillStyle(0x5a3a22, 1); g.fillRect(X + 46, Y + 24, 14, 10); g.fillStyle(0xf4f8ff, 1); g.fillTriangle(X + 44, Y + 25, X + 62, Y + 25, X + 53, Y + 17);
        g.fillStyle(0xffd060, 0.7 + 0.3 * Math.sin(t * 0.1)); g.fillRect(X + 49, Y + 27, 3, 3);
        break; }
      case 'fx-whitenights': {                                                                  // pink sky, a gold spire, palace fronts, the canal
        g.fillStyle(0x7a8ab0, 1); g.fillRect(X, Y + 38, w, h - 38);
        for (const [dx, c] of [[0, 0xa8d8c0], [20, 0xf0d070], [52, 0xe8b0a8]]) { g.fillStyle(c, 1); g.fillRect(X + dx, Y + 26, 22, 12); g.fillStyle(0xffffff, 1); g.fillRect(X + dx, Y + 26, 22, 1); }
        g.fillStyle(0xd8a028, 1); g.fillTriangle(X + 44, Y + 26, X + 50, Y + 26, X + 47, Y + 4 + Math.sin(t * 0.05));
        break; }
      case 'fx-redsquare': {                                                                   // onion domes, a red wall, a star on a spire
        g.fillStyle(0x6a1a16, 1); g.fillRect(X, Y + 34, w, 12); for (let x = X; x < X + w; x += 6) g.fillRect(x, Y + 31, 4, 3);
        for (const [dx, r, c] of [[44, 6, 0xc8201e], [54, 5, 0x2a8a5a], [62, 4, 0xd8a028]]) { g.fillStyle(0x8a2a1e, 1); g.fillRect(X + dx - 3, Y + 22, 6, 12); g.fillStyle(c, 1); g.fillCircle(X + dx, Y + 20, r); g.fillTriangle(X + dx - 3, Y + 18, X + dx + 3, Y + 18, X + dx, Y + 18 - r * 1.6); }
        g.fillStyle(0x6a1a16, 1); g.fillRect(X + 16, Y + 12, 8, 22); g.fillStyle(0xff3a2a, 0.6 + 0.4 * Math.sin(t * 0.1)); g.fillCircle(X + 20, Y + 9, 2.5);
        break; }
      case 'fx-front': { const a = -Math.PI / 2 + Math.sin(t * 0.02) * 0.5; g.fillStyle(0xfff4d0, 0.15); g.fillTriangle(X + 20, Y + h, X + 20 + Math.cos(a - 0.08) * 60, Y + h + Math.sin(a - 0.08) * 60, X + 20 + Math.cos(a + 0.08) * 60, Y + h + Math.sin(a + 0.08) * 60);   // a searchlight, ruins, ash
        g.fillStyle(0x2a2418, 1); for (const [x, hh] of [[0, 14], [10, 20], [22, 10], [34, 24], [48, 12], [58, 18], [68, 9]]) g.fillRect(X + x, Y + 40 - hh, 9, hh);
        if (t % 140 < 8) { g.fillStyle(0xffd090, 0.5); g.fillEllipse(X + 50, Y + 36, 30, 8); }
        for (let i = 0; i < 12; i++) { g.fillStyle(i % 4 ? 0x8a8478 : 0xff9a4a, 1); g.fillRect(X + ((rnd(i, 22) * w + t * 0.3) % w), Y + ((rnd(i, 23) * h + t * 0.4) % h), 1, 1); } break; }
      case 'fx-aurora': for (let b = 0; b < 3; b++) for (let i = 0; i < w; i += 2) { const y = Y + 10 + b * 6 + Math.sin(i * 0.1 + t * 0.03 + b) * 4; g.fillStyle([0x3affa8, 0x5ad0ff, 0xb05aff][b], 0.4); g.fillRect(X + i, y, 2, 8); } break;
    }
    // the stage: a floating island
    g.fillStyle(0x4a3a5a, 1); g.fillTriangle(X + 18, Y + 44, X + 58, Y + 44, X + 38, Y + 54); g.fillStyle({ 'fx-snow': 0xffffff, 'fx-sand': 0xe8c088, 'fx-neon': 0xff7ae8, 'fx-candy': 0xfff4fa, 'fx-sunken': 0x3aa86a, 'fx-harvest': 0xe8822a, 'fx-front': 0x6a7232 }[it.id] ?? 0x6ac87a, 1); g.fillRect(X + 16, Y + 41, 44, 4);
    if (it.id === 'fx-front') { for (let k = 0; k < 3; k++) { g.fillStyle(0x8a7a52, 1); g.fillEllipse(X + 20 + k * 5, Y + 39, 6, 4); } g.lineStyle(1, 0x5a5448, 1); g.lineBetween(X + 40, Y + 38, X + 58, Y + 38); }   // sandbags, wire
    if (it.id === 'fx-bloodmoon') { g.fillStyle(0xff2020, 0.18); g.fillRect(X, Y, w, h); }
    g.lineStyle(1, 0x3a2654, 1); g.strokeRect(X, Y, w, h);
  }
  // an extra: a little picture of what it does
  glyph(g, cx, cy, it, t) {
    const col = it.color ?? C.gold, b = Math.sin(t * 0.08);
    switch (it.id) {
      case 'ext-numbers': { const p = (t % 50) / 50; g.fillStyle(0x5a4a70, 1); g.fillRect(cx - 6, cy + 2, 12, 18); g.fillCircle(cx, cy - 2, 6);   // a dummy, and its damage floating up
        g.fillStyle(0xffffff, 1 - p); g.fillRect(cx + 4 - p * 4, cy - 10 - p * 14, 2, 8); g.fillStyle(0xff5a3a, 1 - p); for (const [x, y, ww, hh] of [[0, 0, 6, 2], [4, 0, 2, 8], [0, 3, 6, 2], [0, 6, 6, 2]]) g.fillRect(cx + 8 + x - p * 4, cy - 10 - p * 14 + y, ww, hh); break; }
      case 'ext-confetti': for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, p = (t % 70) / 70, r = 4 + p * 24; g.fillStyle([0xff5a6a, 0x5ad0ff, 0xf3c358, 0x7aff8a, 0xc77dff][i % 5], 1 - p * 0.7); g.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r + p * p * 10, 3, 2); } break;
      case 'ext-finalcam': g.fillStyle(0x000000, 1); g.fillRect(cx - 34, cy - 24, 68, 8); g.fillRect(cx - 34, cy + 16, 68, 8);   // letterbox bars and a clock running slow
        g.lineStyle(2, 0xffffff, 1); g.strokeCircle(cx, cy - 4, 12); { const a = t * 0.015; g.lineBetween(cx, cy - 4, cx + Math.cos(a) * 9, cy - 4 + Math.sin(a) * 9); g.lineBetween(cx, cy - 4, cx, cy - 11); } break;
      case 'ext-hats': { const y = cy + 12 + Math.abs(b) * -3; g.fillStyle(0x3a8ad8, 1); g.fillTriangle(cx - 12, y, cx + 12, y, cx, y - 30); g.fillStyle(0xf3c358, 1); for (let i = 0; i < 3; i++) g.fillRect(cx - 8 + i * 5, y - 7 - i * 7, 4, 3); g.fillStyle(0xff5a9a, 1); g.fillCircle(cx, y - 31, 4); g.fillStyle(0xffffff, 1); g.fillRect(cx - 13, y - 1, 26, 3); break; }
      case 'ext-moon': { g.fillStyle(0xd8d8e8, 1); g.fillCircle(cx - 14, cy - 10, 10); g.fillStyle(0xa8a8b8, 1); g.fillCircle(cx - 17, cy - 12, 2); g.fillCircle(cx - 10, cy - 6, 3);   // the moon, and someone floating up past it
        const fy = cy + 8 - (Math.sin(t * 0.03) + 1) * 10; g.fillStyle(0xc77dff, 1); g.fillRect(cx + 10, fy, 8, 10); g.fillCircle(cx + 14, fy - 3, 4); g.fillStyle(0xffffff, 0.4); for (let i = 1; i < 4; i++) g.fillRect(cx + 13, fy + 10 + i * 4, 2, 2); break; }
      case 'ext-airhorn': { const blast = (t % 60) < 20; g.fillStyle(0xd8223a, 1); g.fillRect(cx - 20, cy - 2, 12, 12); g.fillStyle(0xe8e4f4, 1); g.fillRect(cx - 18, cy - 10, 8, 8); g.fillTriangle(cx - 8, cy + 4, cx + 14, cy - 8, cx + 14, cy + 16);
        if (blast) { g.lineStyle(2, col, 1); for (let i = 0; i < 3; i++) g.strokeCircle(cx + 16, cy + 4, 4 + i * 5 + (t % 20) * 0.25); } break; }
      case 'ext-rainbow': { const C7 = [0xff4a4a, 0xff9a3a, 0xf3e358, 0x5aff6a, 0x4ac8ff, 0x8a6aff]; for (let i = 0; i < 6; i++) for (let x = 0; x < 44; x += 2) { g.fillStyle(C7[i], x / 44); g.fillRect(cx - 30 + x, cy + 6 - x * 0.4 + i * 2 + Math.sin(x * 0.2 - t * 0.1), 2, 2); }
        g.fillStyle(0xffffff, 1); g.fillCircle(cx + 16, cy - 12, 5); break; }
      case 'ext-firebird': {                                                                  // a burning feather, drifting
        const sw = Math.sin(t * 0.07) * 3;
        g.fillStyle(0xff3a1a, 1); g.fillEllipse(cx + sw, cy, 12, 34); g.fillStyle(0xff8a1a, 1); g.fillEllipse(cx + sw, cy - 2, 8, 26);
        g.fillStyle(0xffd040, 1); g.fillEllipse(cx + sw, cy - 4, 4, 16); g.fillStyle(0xfff4b0, 1); g.fillRect(cx + sw - 0.5, cy - 14, 1, 32);
        for (let k = 0; k < 4; k++) { g.fillStyle(0xffd040, 0.5 + 0.5 * Math.sin(t * 0.2 + k)); g.fillRect(cx + sw + Math.sin(t * 0.1 + k * 2) * 12, cy + 14 - ((t + k * 13) % 30), 2, 2); }
        break; }
      case 'ext-bear': {                                                                      // the cub, dancing
        const bob = Math.abs(Math.sin(t * 0.15)) * 3, y = cy + 4 - bob;
        g.fillStyle(0x6a4424, 1); g.fillEllipse(cx, y + 6, 22, 22); g.fillCircle(cx, y - 10, 10); g.fillCircle(cx - 7, y - 18, 4); g.fillCircle(cx + 7, y - 18, 4);
        g.fillStyle(0xc8201e, 1); g.fillRect(cx - 9, y - 1, 18, 9); g.fillStyle(0xd8a878, 1); g.fillEllipse(cx, y - 7, 9, 6);
        g.fillStyle(0x140a04, 1); g.fillRect(cx - 4, y - 13, 2, 2); g.fillRect(cx + 3, y - 13, 2, 2); g.fillRect(cx - 1, y - 9, 3, 2);
        const up = (t % 30) < 15; g.fillStyle(0x5a3a1c, 1); g.fillRect(cx - 15, up ? y - 12 : y, 5, 9); g.fillRect(cx + 10, up ? y - 12 : y, 5, 9);
        break; }
      case 'ext-ushanka': {                                                                   // a fur hat, flaps swinging, a red star on the front
        const sw = Math.sin(t * 0.08) * 1.5;
        g.fillStyle(0x3a2616, 1); g.fillEllipse(cx, cy - 4, 40, 22); g.fillRect(cx - 20, cy - 4, 40, 12);
        g.fillStyle(0x6a4a2e, 1); g.fillEllipse(cx - 4, cy - 9, 24, 7);
        g.fillStyle(0x4e3420, 1); g.fillRect(cx - 22, cy + 6, 8, 14 + sw); g.fillRect(cx + 14, cy + 6, 8, 14 - sw);
        g.fillStyle(0x8a6a4a, 1); g.fillRect(cx - 20, cy, 40, 6);
        g.fillStyle(0xd8201e, 1); g.fillCircle(cx, cy + 3, 4); g.fillStyle(0xffd040, 1); g.fillRect(cx - 1, cy + 2, 2, 2);
        break; }
      case 'ext-impact': { const flip = (t % 40) < 6; g.fillStyle(flip ? 0xffffff : 0x000000, 1); g.fillRect(cx - 38, cy - 27, 76, 54); g.fillStyle(flip ? 0x000000 : 0xffffff, 1);
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillTriangle(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, cx + Math.cos(a + 0.14) * 25, cy + Math.sin(a + 0.14) * 25, cx + Math.cos(a - 0.14) * 25, cy + Math.sin(a - 0.14) * 25); } break; }
      case 'ext-comic': { const k = (t % 60) < 8 ? 1.15 : 1, pts = [];                       // a POW! starburst, popping
        for (let i = 0; i < 20; i++) { const r = (i % 2 ? 15 : 26) * k, a = i / 20 * Math.PI * 2; pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.7 }); }
        g.fillStyle(0x1a1024, 1); g.fillPoints(pts.map((p) => ({ x: cx + (p.x - cx) * 1.12, y: cy + (p.y - cy) * 1.12 })), true); g.fillStyle(0xffe03a, 1); g.fillPoints(pts, true);
        g.fillStyle(0xff3a2a, 1); for (const [x, y, ww, hh] of [[-14, -5, 2, 10], [-14, -5, 6, 2], [-10, -5, 2, 5], [-14, -1, 6, 2], [-6, -5, 6, 2], [-6, 3, 6, 2], [-6, -5, 2, 10], [-2, -5, 2, 10], [2, -5, 2, 10], [4, 1, 2, 4], [6, -5, 2, 10], [10, -5, 2, 7], [10, 4, 2, 2]]) g.fillRect(cx + x, cy + y, ww, hh); break; }   // P O W !
      case 'ext-combo': { const n = 1 + Math.floor((t % 120) / 20); g.fillStyle(0x5a4a70, 1); g.fillRect(cx - 4, cy + 4, 10, 16); g.fillCircle(cx + 1, cy, 6);   // a dummy taking hit after hit
        for (let i = 0; i < n; i++) { g.fillStyle([0xffe8a0, 0xffe8a0, 0xffe8a0, 0xffb84a, 0xffb84a, 0xff3a3a][i], 1); g.fillRect(cx - 30 + i * 4, cy - 22 + (i % 2) * 2, 3, 3); }
        g.fillStyle(n >= 5 ? 0xff3a3a : 0xffb84a, 1); g.fillRect(cx + 14, cy - 20, 3, 14); g.fillRect(cx + 14, cy - 3, 3, 3);
        if ((t % 20) < 4) { g.fillStyle(0xffffff, 1); g.fillCircle(cx - 6, cy + 2, 4); } break; }
      case 'ext-ghosts': for (let i = 4; i >= 0; i--) { const x = cx - 22 + i * 10 + ((t * 0.6) % 10); g.fillStyle(i === 4 ? 0xe8e4f4 : col, i === 4 ? 1 : 0.15 + i * 0.15); g.fillRect(x - 4, cy - 4, 9, 16); g.fillCircle(x, cy - 9, 5); } break;   // afterimages behind a runner
      case 'ext-disco': { for (let i = 0; i < 6; i++) { g.fillStyle([0xff3ad8, 0x3ad8ff, 0xffe03a, 0x7aff5a, 0xb05aff, 0xff7a3a][(i + (t >> 4)) % 6], 0.9); g.fillRect(cx - 30 + i * 10, cy + 16, 9, 5); }   // a dance floor and a mirror ball
        g.lineStyle(1, 0x8a87a3, 1); g.lineBetween(cx, cy - 27, cx, cy - 16); g.fillStyle(0x8a8aa8, 1); g.fillCircle(cx, cy - 8, 8);
        for (let y = -6; y <= 6; y += 3) for (let x = -6; x <= 6; x += 3) if (x * x + y * y < 50) { g.fillStyle(((x + y + (t >> 3)) / 3 & 3) === 0 ? 0xffffff : 0xc8c8e0, 1); g.fillRect(cx + x, cy - 8 + y, 2, 2); }
        for (let i = 0; i < 3; i++) { const a = Math.PI / 2 + Math.sin(t * 0.03 + i * 2) * 0.8; g.fillStyle([0xff3ad8, 0x3ad8ff, 0xffe03a][i], 0.18); g.fillTriangle(cx, cy - 8, cx + Math.cos(a - 0.15) * 34, cy - 8 + Math.sin(a - 0.15) * 34, cx + Math.cos(a + 0.15) * 34, cy - 8 + Math.sin(a + 0.15) * 34); } break; }
      case 'ext-newsreel': { g.fillStyle(0x1a1410, 1); g.fillRect(cx - 34, cy - 24, 68, 48);                   // a strip of film: sprocket holes, a sepia frame
        for (let i = 0; i < 8; i++) { g.fillStyle(0xd8c8a0, 0.7); g.fillRect(cx - 32 + i * 9, cy - 22, 4, 3); g.fillRect(cx - 32 + i * 9, cy + 19, 4, 3); }
        g.fillStyle(0xc8b088, 1); g.fillRect(cx - 28, cy - 16, 56, 32); g.fillStyle(0x8a7450, 1); g.fillCircle(cx, cy, 12); g.fillStyle(0xc8b088, 1); g.fillCircle(cx, cy, 10);   // the countdown leader
        g.lineStyle(1, 0x3a2e1e, 1); g.lineBetween(cx - 28, cy, cx + 28, cy); g.lineBetween(cx, cy - 16, cx, cy + 16); const a = t * 0.1; g.lineStyle(2, 0x3a2e1e, 1); g.lineBetween(cx, cy, cx + Math.cos(a) * 10, cy + Math.sin(a) * 10);
        if ((t % 30) < 3) { g.fillStyle(0xffffff, 0.5); g.fillRect(cx - 10 + (t % 17), cy - 16, 1, 32); } break; }
      default: g.fillStyle(col, 1); g.fillCircle(cx, cy, 10);
    }
  }
  coin(g, x, y, t) {
    const w = 8 * Math.abs(Math.cos(t * 0.05)) + 2;
    g.fillStyle(0x8a6a1c, 1); g.fillEllipse(x, y + 1, w, 10); g.fillStyle(C.gold, 1); g.fillEllipse(x, y, w, 10); g.fillStyle(0xfff4c8, 1); g.fillRect(x - 1, y - 3, 2, 4);
  }

  update() {
    this.t++;
    const m = this.menu.poll(), t = this.t;
    if (m.up || m.down || m.left || m.right || m.ok || m.back || m.pads.length) this.idle = 0;
    if (++this.idle === 60 * 25 && !this.secret && !this.playing) this.react('stare', 'quiet', 160);   // you've gone quiet: he stares
    if (this.noli && !this.secret && !this.pv && !this.spin && this.t >= (this.nextMutter || 0)) {   // NOLI mutters to himself
      const moods = Object.keys(NOLI_MOODS); this.noliVoice(moods[Math.floor(Math.random() * moods.length)]); this.static = Math.max(this.static, 6);
    }
    if (this.riphood && this.t >= (this.nextRumble || 0)) {                         // RIPHOOD: the guns, far off - the tent shakes, dust falls
      this.nextRumble = this.t + WW2.rumble[0] + Math.floor(Math.random() * (WW2.rumble[1] - WW2.rumble[0]));
      if (this.look === 'ww2') { this.cameras.main.shake(260, 0.003); sfx('thunder', 0.22, 0.45); this.rumble = 40; }
    }
    this.drawLook(t);
    if (this.secret) {                                                              // the code screen / the video: nothing else moves
      const S = this.secret;
      if (S.mode === 'code') {                                               // a gamepad works the keypad too
        const n = KEYPAD.keys.length;
        if (m.left) S.cur = (S.cur + n - 1) % n; if (m.right) S.cur = (S.cur + 1) % n;
        if (m.up) S.cur = (S.cur + n - KEYPAD.cols) % n; if (m.down) S.cur = Math.min(n - 1, S.cur + KEYPAD.cols);
        for (const p of m.pads) { if (p.button === 'a') { S.press = 6; this.typeKey(KEYPAD.keys[S.cur]); } if (p.button === 'b') { this.closeSecret(); break; } }
      }
      if (this.faceT > 0 && --this.faceT === 0) this.react('calm');
      const g = this.g; g.clear(); this.keeper(g, t); this.clicked = null;
      this.coinT.setText(getCoins() + ' ' + this.cur());
      if (!this.kg) this.kg = this.add.graphics().setDepth(40);           // the keypad sits over the cards
      this.kg.clear(); if (this.secret && this.secret.mode === 'code') this.drawKeypad(this.kg, t);
      return;
    }
    if (this.pv || this.spin) {                                                     // an overlay is up: it takes the input
      const ok = m.ok || this.clicked === 'ovok' || m.pads.some((p) => p.button === 'a'), back = m.back || m.pads.some((p) => p.button === 'b') || Phaser.Input.Keyboard.JustDown(this.pKey);
      const cl = this.clicked; this.clicked = null;
      if (this.pv) {
        if (m.left || cl === 'pvprev') this.stepPreview(-1);
        if (m.right || cl === 'pvnext') this.stepPreview(1);
        if (back || (ok && owns(this.pv.it.id))) { this.closeOverlay(); sfx('menu', 0.5); }
        else if (ok) { const it = this.pv.it; this.closeOverlay(); this.buy(); }
        else this.drawPreview(t);
      } else {
        const S = this.spin;
        if (ok || back) {
          if (S.done) { this.closeOverlay(); sfx('menu', 0.5); }
          else if (S.t < 90) S.t = 90;                                         // skip to the prize
          else { S.i++; S.t = 0; if (S.i >= S.res.length) { if (S.res.length > 1) S.done = true; else { this.closeOverlay(); sfx('menu', 0.5); } } }
        }
        if (this.spin) this.drawSpin(t);
      }
      if (this.faceT > 0 && --this.faceT === 0) this.react('calm');
      if (this.msg > 0 && --this.msg === 0) this.msgT.setText('');
      this.coinT.setText(getCoins() + ' ' + this.cur());
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.pKey) || this.clicked === 'preview') { this.clicked = null; const it = this.item(); if (it && it.kind === 'costume') return this.openPreview(it); }
    const tabPrev = Phaser.Input.Keyboard.JustDown(this.qKey) || m.pads.some((p) => p.button === 'lb' || p.button === 'x');
    const tabNext = Phaser.Input.Keyboard.JustDown(this.eKey) || m.pads.some((p) => p.button === 'rb' || p.button === 'y');
    if (tabPrev) this.setTab((this.tab - 1 + SHOP.length) % SHOP.length);
    if (tabNext) this.setTab((this.tab + 1) % SHOP.length);
    const all = this.pages() * PER, at = this.page * PER + this.sel;   // left/right run through every page
    if (m.left || m.right) { const g = (at + (m.left ? -1 : 1) + all) % all; this.page = Math.floor(g / PER); this.sel = g % PER; sfx('menu', 0.4); }
    if (m.up || m.down) { this.sel = (this.sel + GRID.cols) % PER; sfx('menu', 0.4); }
    if (m.ok || this.clicked === 'buy' || m.pads.some((p) => p.button === 'a')) this.buy();
    this.clicked = null;
    if (m.back || m.pads.some((p) => p.button === 'b')) return this.back();
    if (this.msg > 0 && --this.msg === 0) this.msgT.setText('');
    const here = this.page * PER + this.sel;
    if (here !== this.lastSel) { if (this.lastSel >= 0 && this.item()) this.react(owns(this.item().id) ? 'smug' : 'money', this.item().gacha ? 'gamble' : owns(this.item().id) ? 'owned' : 'look'); this.lastSel = here; this.preview(); }   // eyeing something for sale: $ $
    if (this.faceT > 0 && --this.faceT === 0) this.react('calm');

    const g = this.g; g.clear(); this.bgFx.update(t);
    this.keeper(g, t);
    // the tabs
    SHOP.forEach((tb, i) => {
      const x = TAB.x + i * (TAB.w + TAB.gap), on = i === this.tab;
      const lucky = tb.name === 'GAMBLING';                                              // the gambling tab: trimmed in gold, flashing
      slant(g, x + 3, TAB.y + 3, TAB.w, TAB.h, 0x000000, 0.5, 6);
      slant(g, x, TAB.y - (on ? 2 : 0), TAB.w, TAB.h + (on ? 2 : 0), on ? this.acc : this.pal.tabOff, 1, 6);
      if (on) slant(g, x, TAB.y - 2, TAB.w, 7, 0xffffff, 0.25, 2);
      if (lucky && !on) { g.fillStyle((t >> 4) % 2 ? C.gold : 0xd8223a, 1); g.fillRect(x + 6, TAB.y + TAB.h - 2, TAB.w - 8, 2); }
      this.tabT[i].setColor(on ? '#ffffff' : lucky ? '#ffd23f' : '#a8a4c0');
    });
    // the money
    this.coinT.setText(getCoins() + ' ' + this.cur());
    // the cards
    const shelf = shelfItems(SHOP[this.tab]).slice(this.page * PER, this.page * PER + PER);
    if (this.pages() > 1) { this.pageT.setText('PAGE ' + (this.page + 1) + '/' + this.pages()).setVisible(true); for (const s of [-1, 1]) { const ax = PAGE.x + s * 44, n = Math.sin(t * 0.15) * s; g.fillStyle(C.gold, 1); g.fillTriangle(ax + n - s * 4, PAGE.y - 5, ax + n - s * 4, PAGE.y + 5, ax + n + s * 4, PAGE.y); } } else this.pageT.setVisible(false);
    for (let i = 0; i < PER; i++) {
      const [x, y] = this.cardAt(i), it = shelf[i], on = i === this.sel;
      g.fillStyle(0x000000, 0.5); g.fillRect(x + 3, y + 3, GRID.w, GRID.h);
      g.fillStyle(on ? this.acc : this.pal.card, 1); g.fillRect(x, y, GRID.w, GRID.h);
      g.fillStyle(on ? this.pal.cardOn : this.pal.cardIn, 1); g.fillRect(x + 2, y + 2, GRID.w - 4, GRID.h - 4);
      slant(g, x + 2, y + GRID.h - 24, GRID.w - 4, 22, on ? shade(this.acc, 0.35) : this.pal.plate, 1, 6);   // the name plate
      g.fillStyle(this.pal.window, 1); g.fillRect(x + 8, y + 8, GRID.w - 16, 56);                   // the icon window
      if (on) for (let k = 0; k < 2; k++) slant(g, x + 8 + ((t * 1.5 + k * 50) % (GRID.w + 20)) - 20, y + 8, 10, 56, 0xffffff, 0.05, 20);   // light sweeping the picked card's window
      this.icon(g, x + GRID.w / 2, y + 36, 16, it, t + i * 9);
      this.cardName[i].setText(it ? it.name : 'COMING SOON').setColor(it ? '#e8e4f4' : '#5a4a70');
      const mine = it && !it.gacha && owns(it.id), lit = mine && isEquipped(it.kind, it.id);
      this.cardPrice[i].setText(!it ? '' : lit ? 'ON' : mine ? 'OWNED' : it.price + ' ' + this.cur()).setColor(lit ? '#7aff8a' : mine ? '#c9c4dc' : '#f3c358');
      if (lit) { g.fillStyle(0x7aff8a, 1); g.fillCircle(x + GRID.w - 12, y + 13, 3); }                                   // a green light: switched on
      // a costume: its fighter wearing it, idling (scaled to fit the window)
      const spr = this.cardSpr[i], fd = it && it.kind === 'costume' ? fighterById(it.fighter) : null;
      if (fd && fd.def) {
        const si = skinsFor(fd.def.id).findIndex((k) => k.name === it.skin);
        showFighter(spr.setVisible(true), fd.def, Math.floor((t + i * 7) / 6), Math.max(0, si));
        spr.setScale(Math.min(1, 54 / spr.frame.height, 74 / spr.frame.width * 1.3)).setPosition(x + GRID.w / 2, y + 62);
      } else if (it && it.img) spr.setVisible(true).setTexture(it.img, it.imgFrame ?? 0).setOrigin(0.5).setFlipX(false).setScale(it.gacha ? 1 : 0.8).setPosition(x + GRID.w / 2, y + 36 + Math.round(Math.sin((t + i * 9) * 0.05) * 2));   // e.g. the GALAXY FRAGMENT, bobbing
      else spr.setVisible(false);
      if (on) { const p = (t % 60) / 60; g.lineStyle(2, this.acc, 0.6 * (1 - p)); g.strokeRect(x - 2 - p * 4, y - 2 - p * 4, GRID.w + 4 + p * 8, GRID.h + 4 + p * 8); }   // a pulse round the picked card
    }
    // the details panel
    const it = this.item();
    panel(g, SIDE.x, SIDE.y, SIDE.w, SIDE.h, this.acc, { sk: 6, fill: this.pal.cardIn });
    this.nameT.setText(it ? it.name : 'COMING SOON');
    this.infoT.setText(it ? it.info || '' : 'THIS SHELF IS EMPTY FOR NOW.');
    const lab = this.label(it), mine = it && !it.gacha && owns(it.id);
    this.buyT.setText(lab === 'BUY' || lab === 'SPIN' ? lab + '  ' + it.price : lab);
    const can = it && (mine ? it.kind !== 'costume' && it.kind !== 'unlock' : getCoins() >= it.price);
    const cos = it && it.kind === 'costume', bx = SIDE.x + 20 + (cos ? BTN.prevW + 4 : 0), bw = SIDE.w - 40 - (cos ? BTN.prevW + 4 : 0);
    slant(g, bx + 3, BTN.y + 3, bw, BTN.h, 0x000000, 0.5, 8);
    slant(g, bx, BTN.y, bw, BTN.h, can ? 0x2fae4a : 0x2c2650, 1, 8);
    slant(g, bx, BTN.y, bw, 10, 0xffffff, can ? 0.2 + 0.08 * Math.sin(t * 0.15) : 0.05, 3);
    this.buyT.setColor(can ? '#ffffff' : '#8a87a3').setX(bx + bw / 2).setFontSize(cos ? 8 : 9);
    this.prevT.setVisible(!!cos);
    if (cos) { slant(g, SIDE.x + 23, BTN.y + 3, BTN.prevW, BTN.h, 0x000000, 0.5, 8); slant(g, SIDE.x + 20, BTN.y, BTN.prevW, BTN.h, 0x3b6bd8, 1, 8); slant(g, SIDE.x + 20, BTN.y, BTN.prevW, 10, 0xffffff, 0.15, 3); }
    this.coin(g, W - 22 - this.coinT.width, 34, t);                                   // the money, with its little spinning coin
  }
}

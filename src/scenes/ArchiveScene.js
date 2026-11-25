// THE ARCHIVE (TRINKETS > LORE > ARCHIVE, or R on the LORE screen): the loose documents of the world - the Archivist's
// notes on the Starfall, papers the fighters left behind, a file on every boss, the HAPPY HILLS tapes, field notes on
// the stages (ARCHIVE in src/data/loreArchive.js). A boss's documents stay CLASSIFIED until that boss has been beaten
// once (`lock`). Unread documents carry a dot (read ones are remembered as `rebirth.loreRead`).
// W/S picks a document, A/D turns its pages, K / Esc / B goes back to LORE. Mouse: click a document, or the page arrows.
import { VIEW_W, FONT } from '../config.js';
import { playMusic } from '../audio/music.js';
import { MenuInput } from './menuInput.js';
import { sfx } from '../audio/sfx.js';
import { makeButton } from '../ui/button.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { ARCHIVE, ARCHIVE_CATS } from '../data/loreArchive.js';
import { bossWins, bossById } from '../data/bosses.js';
import { ArcadeBg, titleBanner, hintBar, panel, slant, ARC } from '../ui/arcade.js';

const LINE = ARC.sections.files, DIM = '#8a87a3', GOLD = '#ffd23f';
// the list (left) and the document (right); how tall a list row is; how many body lines fit on a page
const L = { x: 16, y: 54, w: 214, h: 278 }, R = { x: 240, y: 54, w: 384, h: 278 }, ROW = 11, BODY_LINES = 18;
const READ_KEY = 'rebirth.loreRead';

/** The documents read so far (ids), from this browser. */
function readSet() { try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]')); } catch (e) { return new Set(); } }
/** Whether a document can be read yet (its boss beaten at least once, if it has a lock). */
export function docOpen(d) { return !d.lock || [0, 1, 2].some((t) => bossWins(d.lock, t) > 0); }

/** THE ARCHIVE screen (see the top of the file). */
export class ArchiveScene extends Phaser.Scene {
  constructor() { super('Archive'); }

  /** Builds the list of documents (grouped by section) and the reading panel. */
  create(data) {
    this.t = 0; this.menu = new MenuInput(this); this.read = readSet(); this.fromFi = (data && data.fi) || 0;
    playMusic(this, 'bgm_title');
    this.bgFx = new ArcadeBg(this, LINE, { second: ARC.sections.trinkets });
    const g = this.add.graphics();
    panel(g, L.x, L.y, L.w, L.h, LINE); panel(g, R.x, R.y, R.w, R.h, LINE);
    titleBanner(this, 'THE ARCHIVE', LINE, { crumb: 'TRINKETS  >  LORE  >  ARCHIVE', size: 13 });
    // the rows: a header per section, then its documents
    this.rows = [];
    for (const c of ARCHIVE_CATS) { this.rows.push({ head: c }); for (const d of ARCHIVE.filter((q) => q.cat === c.id)) this.rows.push({ doc: d, cat: c }); }
    this.docs = this.rows.filter((r) => r.doc).map((r) => r.doc);
    this.sel = 0; this.page = 0; this.top = 0;
    this.listG = this.add.graphics();
    this.rowT = Array.from({ length: Math.floor((L.h - 16) / ROW) }, () => this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '5px', color: '#ffffff' }));
    this.count = this.add.text(L.x + L.w - 8, L.y + L.h - 10, '', { fontFamily: FONT, fontSize: '5px', color: DIM }).setOrigin(1, 0);
    // the document
    this.docG = this.add.graphics();
    this.kind = this.add.text(R.x + 20, R.y + 12, '', { fontFamily: FONT, fontSize: '5px', color: '#120a1c' });
    this.title = this.add.text(R.x + 14, R.y + 26, '', { fontFamily: FONT, fontSize: '9px', color: '#ffffff', stroke: '#07060e', strokeThickness: 4, wordWrap: { width: R.w - 28 } });
    this.from = this.add.text(R.x + 14, R.y + 44, '', { fontFamily: FONT, fontSize: '5px', color: DIM, wordWrap: { width: R.w - 28 } });
    this.body = this.add.text(R.x + 14, R.y + 60, '', { fontFamily: FONT, fontSize: '5px', color: '#e8e4f4', lineSpacing: 5, wordWrap: { width: R.w - 28 } });
    this.pageT = this.add.text(R.x + R.w / 2, R.y + R.h - 12, '', { fontFamily: FONT, fontSize: '5px', color: GOLD }).setOrigin(0.5, 0);
    this.arrows = [-1, 1].map((d) => makeButton(this, R.x + R.w / 2 + d * 60, R.y + R.h - 10, d < 0 ? '<' : '>', () => this.turn(d), { originX: 0.5, originY: 0.5, size: '7px' }));
    hintBar(this, 'W/S DOCUMENT   A/D PAGE   CLICK TO READ   K / ESC / B  BACK TO LORE', LINE);
    makeButton(this, 8, 6, '< LORE', () => this.back());
    addFullscreenButton(this, VIEW_W - 8, 6);
    this.input.on('pointerdown', (p, over) => {
      if (over.length || p.x < L.x || p.x > L.x + L.w || p.y < L.y + 6) return;
      const r = this.rows[this.top + Math.floor((p.y - L.y - 6) / ROW)];
      if (r && r.doc) this.pick(this.docs.indexOf(r.doc));
    });
    this.pick(0, true);
  }

  /** Back to the LORE screen, on the fighter you came from. */
  back() { sfx('menu', 0.6); this.scene.start('Files', { fi: this.fromFi }); }
  /** Opens document `i` at its first page (and remembers it as read). */
  pick(i, quiet) {
    this.sel = (i + this.docs.length) % this.docs.length; this.page = 0;
    const d = this.docs[this.sel];
    if (docOpen(d) && !this.read.has(d.id)) { this.read.add(d.id); try { localStorage.setItem(READ_KEY, JSON.stringify([...this.read])); } catch (e) { /* storage unavailable */ } }
    if (!quiet) sfx('menu', 0.5, 1.1);
    this.layout();
  }
  /** Turns the page (d = -1 / 1). */
  turn(d) { const n = this.pages.length; if (n < 2) return; this.page = (this.page + d + n) % n; sfx('menu', 0.4, 1.3); this.show(); }
  /** Splits the open document into pages and shows the first. */
  layout() {
    const d = this.docs[this.sel], open = docOpen(d);
    const text = open ? d.text : 'THIS FILE IS CLASSIFIED.\n\nBeat ' + ((bossById(d.lock) || {}).name || 'its boss') + ' in BOSS FIGHTS (any difficulty) to open it.';
    const lines = this.body.setText('').getWrappedText(text);
    this.pages = []; for (let i = 0; i < lines.length; i += BODY_LINES) this.pages.push(lines.slice(i, i + BODY_LINES).join('\n'));
    if (!this.pages.length) this.pages = [''];
    this.show();
  }
  /** Shows the current page of the open document. */
  show() {
    const d = this.docs[this.sel], open = docOpen(d), cat = ARCHIVE_CATS.find((c) => c.id === d.cat);
    this.kind.setText(open ? d.kind : 'CLASSIFIED');
    this.title.setText(open ? d.title : '? ? ? ? ?').setColor(open ? '#ffffff' : '#ff4a4a');
    this.from.setText(open ? d.from : '');
    this.body.setText(this.pages[this.page]).setColor(open ? '#e8e4f4' : '#ff8a8a');
    this.pageT.setText(this.pages.length > 1 ? 'PAGE ' + (this.page + 1) + ' / ' + this.pages.length : '');
    this.arrows.forEach((a) => a.setVisible(this.pages.length > 1));
    const g = this.docG; g.clear();
    const col = Phaser.Display.Color.HexStringToColor(open ? cat.color : '#ff3a3a').color;
    slant(g, R.x + 14, R.y + 9, this.kind.width + 14, 11, col, 1, 4);
    g.fillStyle(col, 0.5); g.fillRect(R.x + 14, R.y + 56, R.w - 28, 1);
    if (!open) { g.lineStyle(3, 0xff3a3a, 0.5); g.strokeRect(R.x + R.w - 120, R.y + 120, 96, 40); }
  }

  /** Reads the keys / pad, keeps the chosen document in view and redraws the list. */
  update() {
    this.t++; this.bgFx.update(this.t);
    const m = this.menu.poll();
    if (m.up) this.pick(this.sel - 1);
    if (m.down) this.pick(this.sel + 1);
    if (m.left) this.turn(-1);
    if (m.right) this.turn(1);
    if (m.back || m.pads.some((p) => p.button === 'b')) return this.back();
    // the list: keep the chosen document in view
    const vis = this.rowT.length, at = this.rows.findIndex((r) => r.doc === this.docs[this.sel]);
    if (at < this.top + 1) this.top = Math.max(0, at - 1);
    if (at >= this.top + vis) this.top = at - vis + 1;
    const g = this.listG; g.clear();
    this.rowT.forEach((tx, i) => {
      const r = this.rows[this.top + i], y = L.y + 6 + i * ROW;
      if (!r) { tx.setText(''); return; }
      if (r.head) { tx.setText(r.head.name).setPosition(L.x + 8, y + 2).setColor(r.head.color); g.fillStyle(Phaser.Display.Color.HexStringToColor(r.head.color).color, 0.25); g.fillRect(L.x + 6, y + ROW - 2, L.w - 12, 1); return; }
      const on = r.doc === this.docs[this.sel], open = docOpen(r.doc);
      if (on) slant(g, L.x + 6, y, L.w - 12, ROW - 1, LINE, 0.9, 4);
      tx.setText((open ? r.doc.title : 'CLASSIFIED')).setPosition(L.x + 16, y + 2).setColor(on ? '#ffffff' : open ? '#c9c4dc' : '#7a5a6a');
      if (open && !this.read.has(r.doc.id)) { g.fillStyle(0xffd23f, 0.6 + 0.4 * Math.sin(this.t * 0.15)); g.fillCircle(L.x + 11, y + 5, 2); }
      if (!open) { g.fillStyle(0xff3a3a, 0.8); g.fillRect(L.x + 9, y + 3, 4, 4); }
    });
    this.count.setText((this.sel + 1) + ' / ' + this.docs.length + '   ' + this.docs.filter(docOpen).length + ' OPEN');
  }
}

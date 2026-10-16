// On-screen touch controls for phones and tablets: a floating thumbstick on the left half of the
// screen and action buttons on the right. Several fingers work at once (move + jump + attack).
// The pad fills in a Controller, so fighter code treats it like a keyboard or gamepad.
import { VIEW_W, VIEW_H, FONT, LIMIT_MAX } from '../config.js';
import { settings } from '../settings.js';
import { Controller } from './controllers.js';

let touchSeen = false;
if (typeof window !== 'undefined') window.addEventListener('touchstart', () => { touchSeen = true; }, { passive: true, once: true });

// Touch controls show when the setting is ON, or on AUTO when the device has a touch screen.
export function touchEnabled() {
  if (settings.touch === 'on') return true;
  if (settings.touch === 'off') return false;
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  return touchSeen || coarse;
}

const STICK_R = 34;                 // how far the thumb moves for full tilt
const BUTTONS = [
  { id: 'attack', label: 'ATK', x: 594, y: 258, r: 23, color: 0xff5a5a },
  { id: 'special', label: 'SPC', x: 550, y: 290, r: 21, color: 0x4fa8ff },
  { id: 'jump', label: 'JUMP', x: 548, y: 232, r: 21, color: 0x5ee07a },
  { id: 'shield', label: 'SHLD', x: 604, y: 206, r: 17, color: 0xffd34f },
  { id: 'grab', label: 'GRAB', x: 504, y: 268, r: 16, color: 0xc9c4dc },
  { id: 'limit', label: 'LIMIT', x: 600, y: 156, r: 18, color: 0x78a0c6 },
];

export class TouchPad {
  constructor(scene, fighterRef) {
    this.scene = scene; this.fighterRef = fighterRef;
    this.stick = null;              // { id, ox, oy, x, y }
    this.held = {};
    scene.input.addPointer(3);      // up to 4 fingers at once
    this.g = scene.add.graphics().setDepth(40);
    this.labels = BUTTONS.map((b) => scene.add.text(b.x, b.y, b.label, { fontFamily: FONT, fontSize: b.r > 19 ? '7px' : '6px', color: '#ffffff' }).setOrigin(0.5).setDepth(41).setAlpha(0.85));
    scene.addUI(this.g, ...this.labels);

    this.onDown = (p, over) => {
      if ((over && over.length) || this.stick || this.buttonAt(p.x, p.y) || p.x > VIEW_W * 0.45 || p.y < 70) return;
      this.stick = { id: p.id, ox: p.x, oy: p.y, x: p.x, y: p.y };
    };
    this.onUp = (p) => { if (this.stick && this.stick.id === p.id) this.stick = null; };
    scene.input.on('pointerdown', this.onDown);
    scene.input.on('pointerup', this.onUp);
    scene.input.on('pointerupoutside', this.onUp);
    scene.events.once('shutdown', () => { scene.input.off('pointerdown', this.onDown); scene.input.off('pointerup', this.onUp); scene.input.off('pointerupoutside', this.onUp); });
  }

  buttonAt(x, y) { return BUTTONS.find((b) => Math.hypot(x - b.x, y - b.y) <= b.r + 7); }

  // read every finger on the screen once per frame
  update() {
    this.held = {};
    for (const p of this.scene.input.manager.pointers) {
      if (!p.isDown) continue;
      if (this.stick && p.id === this.stick.id) { this.stick.x = p.x; this.stick.y = p.y; continue; }
      const b = this.buttonAt(p.x, p.y);
      if (b) this.held[b.id] = true;
    }
    if (this.stick && !this.scene.input.manager.pointers.some((p) => p.isDown && p.id === this.stick.id)) this.stick = null;
  }

  axes() {
    if (!this.stick) return { x: 0, y: 0 };
    let dx = (this.stick.x - this.stick.ox) / STICK_R, dy = (this.stick.y - this.stick.oy) / STICK_R;
    const m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; }
    return { x: Math.abs(dx) < 0.25 ? 0 : dx, y: Math.abs(dy) < 0.25 ? 0 : dy };
  }

  draw() {
    const g = this.g; g.clear();
    // thumbstick: shows where your thumb landed; faint hint when not touching
    const s = this.stick, ox = s ? s.ox : 74, oy = s ? s.oy : 246;
    const a = this.axes();
    g.fillStyle(0x0b0a14, s ? 0.35 : 0.2); g.fillCircle(ox, oy, STICK_R + 8);
    g.lineStyle(2, 0xffffff, s ? 0.5 : 0.25); g.strokeCircle(ox, oy, STICK_R + 8);
    g.fillStyle(0xffffff, s ? 0.55 : 0.25); g.fillCircle(ox + a.x * STICK_R, oy + a.y * STICK_R, 15);
    // buttons
    const f = this.fighterRef();
    for (const [i, b] of BUTTONS.entries()) {
      const on = this.held[b.id];
      const dim = b.id === 'limit' && !(f && f.limit >= LIMIT_MAX);
      g.fillStyle(b.color, dim ? 0.12 : on ? 0.75 : 0.35); g.fillCircle(b.x, b.y, b.r);
      g.lineStyle(2, 0xffffff, dim ? 0.2 : on ? 0.9 : 0.45); g.strokeCircle(b.x, b.y, b.r);
      this.labels[i].setAlpha(dim ? 0.3 : 0.9);
    }
  }
}

export class TouchController extends Controller {
  constructor(pad) { super(); this.pad = pad; }
  poll() {
    this.pad.update();
    const a = this.pad.axes(), h = this.pad.held;
    this.x = a.x; this.y = a.y;
    for (const b of ['jump', 'attack', 'special', 'shield', 'grab', 'limit']) this.cur[b] = !!h[b];
    this.cur.pause = false;
  }
}

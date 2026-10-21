// Every fighter is driven by a Controller. Keyboard, gamepad and CPU all fill in the same
// button state each frame, so fighter code never knows who is pressing the buttons.

const BUTTONS = ['jump', 'attack', 'special', 'shield', 'grab', 'limit', 'taunt', 'pause'];

export class Controller {
  constructor() {
    this.x = 0; this.y = 0;          // stick: x -1 left .. 1 right, y -1 up .. 1 down
    this.px = 0; this.py = 0;        // last frame's stick
    this.cur = {}; this.prev = {};
    for (const b of BUTTONS) { this.cur[b] = false; this.prev[b] = false; }
  }
  // Called once per simulation step, before the fighter reads it.
  beginFrame() {
    this.px = this.x; this.py = this.y;
    for (const b of BUTTONS) this.prev[b] = this.cur[b];
  }
  held(b) { return this.cur[b]; }
  pressed(b) { return this.cur[b] && !this.prev[b]; }
  released(b) { return !this.cur[b] && this.prev[b]; }
  get up() { return this.y < -0.5; }
  get down() { return this.y > 0.5; }
  get left() { return this.x < -0.5; }
  get right() { return this.x > 0.5; }
  tappedDown() { return this.y > 0.5 && this.py <= 0.5; }
  tappedSide() { return Math.abs(this.x) > 0.5 && Math.abs(this.px) <= 0.5; }
}

// Player 1's keyboard: WASD move (W also jumps), Space jump, J attack, K special,
// L shield, I grab, O Limit, 1 taunt, Esc pause.
export class KeyboardController extends Controller {
  constructor(scene) {
    super();
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = scene.input.keyboard.addKeys({
      w: K.W, a: K.A, s: K.S, d: K.D, space: K.SPACE,
      j: K.J, k: K.K, l: K.L, i: K.I, o: K.O, one: K.ONE, esc: K.ESC, enter: K.ENTER,
    }, false);
    scene.input.keyboard.addCapture([K.SPACE]);
    // latch very short taps so a press shorter than one frame still counts
    this.latch = {};
    const map = { [K.SPACE]: 'jump', [K.W]: 'jump', [K.J]: 'attack', [K.K]: 'special', [K.L]: 'shield', [K.I]: 'grab', [K.O]: 'limit', [K.ONE]: 'taunt', [K.ESC]: 'pause' };
    this.onKey = (e) => { const b = map[e.keyCode]; if (b) this.latch[b] = true; };
    scene.input.keyboard.on('keydown', this.onKey);
    scene.events.once('shutdown', () => scene.input.keyboard.off('keydown', this.onKey));
  }
  poll() {
    const k = this.keys;
    this.x = (k.d.isDown ? 1 : 0) - (k.a.isDown ? 1 : 0);
    this.y = (k.s.isDown ? 1 : 0) - (k.w.isDown ? 1 : 0);
    this.cur.jump = k.space.isDown || k.w.isDown;
    this.cur.attack = k.j.isDown;
    this.cur.special = k.k.isDown;
    this.cur.shield = k.l.isDown;
    this.cur.grab = k.i.isDown;
    this.cur.limit = k.o.isDown;
    this.cur.taunt = k.one.isDown;
    this.cur.pause = k.esc.isDown;
    for (const b in this.latch) { if (this.latch[b]) this.cur[b] = true; this.latch[b] = false; }
  }
}

// Reads a controller through the browser Gamepad API (Bluetooth or USB, standard mapping).
// A attack, B special, X/Y jump, LB/RB grab, LT/RT shield, LB+RB together = Limit, either stick click = taunt,
// Start pause.
export function readPad(index) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  return pads && pads[index] ? pads[index] : null;
}

export class GamepadController extends Controller {
  constructor(padIndex) {
    super();
    this.padIndex = padIndex;
    this.bumperWindow = 0;     // short window to tell "grab" from "both bumpers = Limit"
  }
  poll() {
    const pad = readPad(this.padIndex);
    if (!pad) { this.x = 0; this.y = 0; for (const b in this.cur) this.cur[b] = false; return; }
    const btn = (i) => !!(pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > 0.5));
    let x = pad.axes[0] || 0, y = pad.axes[1] || 0;
    if (Math.abs(x) < 0.25) x = 0;
    if (Math.abs(y) < 0.25) y = 0;
    if (btn(14)) x = -1; if (btn(15)) x = 1; if (btn(12)) y = -1; if (btn(13)) y = 1;
    this.x = x; this.y = y;
    this.cur.attack = btn(0);
    this.cur.special = btn(1);
    this.cur.jump = btn(2) || btn(3);
    this.cur.shield = btn(6) || btn(7);
    this.cur.pause = btn(9);
    this.cur.taunt = btn(10) || btn(11);
    const lb = btn(4), rb = btn(5);
    this.cur.limit = lb && rb;
    // Grab fires a few frames after a single bumper press, unless the other bumper joins it.
    if ((lb || rb) && !(lb && rb)) this.bumperWindow++; else this.bumperWindow = 0;
    this.cur.grab = this.bumperWindow >= 3 && !this.cur.limit;
  }
}

// Combines several controllers into one (player 1 = keyboard + optional gamepad).
export class MergedController extends Controller {
  constructor(parts) { super(); this.parts = parts; }
  poll() {
    let x = 0, y = 0;
    for (const p of this.parts) { p.poll(); if (Math.abs(p.x) > Math.abs(x)) x = p.x; if (Math.abs(p.y) > Math.abs(y)) y = p.y; }
    this.x = x; this.y = y;
    for (const b in this.cur) this.cur[b] = this.parts.some((p) => p.cur[b]);
  }
}

// Menu navigation that listens to the keyboard and every connected controller at once.
import { readPad } from '../input/controllers.js';

export class MenuInput {
  constructor(scene) {
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = scene.input.keyboard.addKeys({
      up: K.W, down: K.S, left: K.A, right: K.D, up2: K.UP, down2: K.DOWN, left2: K.LEFT, right2: K.RIGHT,
      ok: K.ENTER, ok2: K.J, ok3: K.SPACE, back: K.ESC, back2: K.K,
    }, false);
    this.prev = {}; this.repeat = {};
  }
  // Returns the set of actions pressed this frame: up/down/left/right/ok/back, plus pad events.
  poll() {
    const k = this.keys, now = {}, JD = Phaser.Input.Keyboard.JustDown;
    const tapped = {};
    for (const [a, names] of Object.entries({ up: ['up', 'up2'], down: ['down', 'down2'], left: ['left', 'left2'], right: ['right', 'right2'], ok: ['ok', 'ok2', 'ok3'], back: ['back', 'back2'] })) {
      now[a] = names.some((n) => k[n].isDown);
      tapped[a] = names.some((n) => JD(k[n]));   // catches very quick taps between frames
    }
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const padPresses = [];
    for (let i = 0; i < (pads ? pads.length : 0); i++) {
      const p = readPad(i); if (!p) continue;
      const b = (n) => !!(p.buttons[n] && p.buttons[n].pressed);
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      now.up = now.up || b(12) || ay < -0.6; now.down = now.down || b(13) || ay > 0.6;
      now.left = now.left || b(14) || ax < -0.6; now.right = now.right || b(15) || ax > 0.6;
      for (const [btn, name] of [[0, 'a'], [1, 'b'], [2, 'x'], [3, 'y'], [9, 'start']]) {
        const key = 'pad' + i + name;
        if (b(btn) && !this.prev[key]) padPresses.push({ pad: i, button: name });
        now[key] = b(btn);
      }
    }
    // ignore buttons still held from the previous screen
    if (!this.started) { this.started = true; this.prev = now; return { pads: [] }; }
    const out = { pads: padPresses };
    for (const a of ['up', 'down', 'left', 'right', 'ok', 'back']) {
      // first press, then auto-repeat while held
      if ((now[a] && !this.prev[a]) || (tapped[a] && !now[a])) { out[a] = true; this.repeat[a] = 18; }
      else if (now[a]) { if (--this.repeat[a] <= 0) { out[a] = true; this.repeat[a] = 5; } }
    }
    this.prev = now;
    return out;
  }
}

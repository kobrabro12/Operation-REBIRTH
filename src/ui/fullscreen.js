// Full screen toggle: a button on every screen plus the F key.
// iPhones don't allow web pages to go full screen, so there the button explains the
// Home Screen route instead (the game then opens full screen from its icon).
import { FONT } from '../config.js';
import { makeButton } from './button.js';
import { sfx } from '../audio/sfx.js';

const isIOS = () => /iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 && !document.fullscreenEnabled);

export function toggleFullscreen(scene) {
  const sc = scene.scale;
  if (!sc.fullscreen.available) { showTip(scene); return; }
  try { sc.isFullscreen ? sc.stopFullscreen() : sc.startFullscreen(); sfx('menu', 0.5); } catch (e) { showTip(scene); }
}

function showTip(scene) {
  const msg = isIOS() ? 'IPHONE: TAP SHARE, THEN\nADD TO HOME SCREEN' : 'FULL SCREEN IS NOT ALLOWED HERE.\nOPEN THE GAME IN ITS OWN TAB.';
  const t = scene.add.text(scene.scale.width / 2, 60, msg, { fontFamily: FONT, fontSize: '8px', color: '#ffffff', backgroundColor: '#2e246c', padding: { x: 8, y: 6 }, align: 'center', lineSpacing: 6 }).setOrigin(0.5).setDepth(60);
  if (scene.addUI) scene.addUI(t);
  scene.time.delayedCall(3200, () => t.destroy());
}

// Adds the button (top-right by default) and keeps its label in sync.
export function addFullscreenButton(scene, x, y, opts = {}) {
  const label = () => (scene.scale.isFullscreen ? 'EXIT FULL SCREEN' : 'FULL SCREEN');
  const b = makeButton(scene, x, y, label(), () => toggleFullscreen(scene), { originX: 1, size: '6px', depth: 30, ...opts });
  const sync = () => b.setText(label());
  scene.scale.on('enterfullscreen', sync); scene.scale.on('leavefullscreen', sync);
  scene.events.once('shutdown', () => { scene.scale.off('enterfullscreen', sync); scene.scale.off('leavefullscreen', sync); });
  const key = scene.input.keyboard.addKey('F', false);
  key.on('down', () => toggleFullscreen(scene));
  return b;
}

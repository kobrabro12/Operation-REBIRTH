// The announcer: calls out a fighter's name when a player picks them on the select screen, and the stage's
// name when one is picked (computer voice from tools/audio/announcer.py; tools/audio/my_voice.py swaps
// in your own recordings). Follows the SOUND EFFECTS volume. A new
// call cuts off the previous one so quick picks don't talk over each other.
import { settings } from '../settings.js';

let current = null;

export function announce(scene, id) {
  const key = 'voice_' + id;
  if (!scene.cache.audio.exists(key) || settings.sfxVolume <= 0) return;
  if (current) { current.stop(); current.destroy(); current = null; }
  current = scene.sound.add(key, { volume: Math.min(1, settings.sfxVolume * 1.1) });
  current.once('complete', () => { if (current) { current.destroy(); current = null; } });
  current.play();
}

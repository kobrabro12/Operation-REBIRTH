// Plays Mason's voice lines (the list is src/data/voiceLines.js). Follows the SOUND EFFECTS volume; silent in the
// title demo. One fighter can't talk over themselves: a new line waits until GAP_MS after their last one.
import { settings } from '../settings.js';
import { VOICE_LINES } from '../data/voiceLines.js';

// the shortest gap between two lines from the same fighter, in milliseconds
const GAP_MS = 1200;
const last = {};

export function loadVoiceLines(load) {
  for (const v of VOICE_LINES) load.audio('vl_' + v.id, ['assets/audio/voice/custom/' + v.id + '.ogg', 'assets/audio/voice/custom/' + v.id + '.mp3']);
}

// say a line for this fighter and moment, if Mason made one. Returns true when a line played.
export function voiceLine(scene, fighterId, event) {
  if (!VOICE_LINES.length || scene.demo || settings.sfxVolume <= 0) return false;
  const fits = VOICE_LINES.filter((v) => v.event === event && (v.fighter === fighterId || v.fighter === 'any') && scene.cache.audio.exists('vl_' + v.id));
  if (!fits.length) return false;
  const now = performance.now();
  if (now - (last[fighterId] || 0) < GAP_MS) return false;
  last[fighterId] = now;
  const v = fits[Math.floor(Math.random() * fits.length)];   // (presentation only: doesn't touch the match's random numbers)
  scene.sound.play('vl_' + v.id, { volume: Math.min(1, settings.sfxVolume * (v.volume || 1.1)) });
  return true;
}

// Background music: one looping track at a time, shared by every scene. Asking for the track that is
// already playing does nothing, so the menu theme carries on unbroken from screen to screen.
// Volume follows settings.musicVolume (0..1) and changes live from the setup screen.
import { settings } from '../settings.js';

let current = null, currentKey = null, base = 1;

export function playMusic(scene, key, volume = 0.6) {
  if (key && key === currentKey && current && (current.isPlaying || current.pendingPlay)) return;
  stopMusic();
  if (!key || !scene.cache.audio.exists(key)) return;
  const sm = scene.sound;
  currentKey = key; base = volume;
  current = sm.add(key, { loop: true, volume: base * settings.musicVolume });
  if (sm.locked) {                                   // browsers block audio until the first click / key press
    current.pendingPlay = true;
    const snd = current;
    sm.once('unlocked', () => { if (current === snd) { snd.pendingPlay = false; snd.play(); } });
  } else current.play();
}

export function stopMusic() {
  if (current) { try { current.stop(); current.destroy(); } catch (e) { /* already gone */ } }
  current = null; currentKey = null;
}

export function updateMusicVolume() { if (current) current.setVolume(base * settings.musicVolume); }

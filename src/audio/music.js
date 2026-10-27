// Background music: one looping track at a time, shared by every scene. Asking for the track that is
// already playing does nothing, so the menu theme carries on unbroken from screen to screen.
// Volume follows settings.musicVolume (0..1) and changes live from the setup screen.
import { settings } from '../settings.js';

let current = null, currentKey = null, base = 1;
const rotation = {};                                 // playlists: which track each one starts on next time

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

// A rotating soundtrack: plays each track through once, then the next, round and round. Each time the
// same playlist is started again (the next match on that stage) it begins one track further on.
export function playPlaylist(scene, keys, volume = 0.6) {
  keys = keys.filter((k) => scene.cache.audio.exists(k));
  if (!keys.length) { stopMusic(); return; }
  const id = 'list:' + keys.join(',');
  if (id === currentKey && current && (current.isPlaying || current.pendingPlay)) return;
  stopMusic();
  let i = rotation[id] || 0; rotation[id] = (i + 1) % keys.length;
  const sm = scene.sound;
  currentKey = id; base = volume;
  const next = () => {
    if (currentKey !== id) return;
    const snd = sm.add(keys[i % keys.length], { loop: false, volume: base * settings.musicVolume });
    i++;
    if (current) { try { current.destroy(); } catch (e) { /* gone */ } }
    current = snd;
    snd.once('complete', () => { if (current === snd) next(); });
    if (sm.locked) { snd.pendingPlay = true; sm.once('unlocked', () => { if (current === snd) { snd.pendingPlay = false; snd.play(); } }); }
    else snd.play();
  };
  next();
}

export function stopMusic() {
  if (current) { try { current.stop(); current.destroy(); } catch (e) { /* already gone */ } }
  current = null; currentKey = null;
}

export function updateMusicVolume() { if (current) current.setVolume(base * settings.musicVolume); }

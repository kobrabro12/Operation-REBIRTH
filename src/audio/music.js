// Background music: one looping track at a time, shared by every scene. Asking for the track that is
// already playing does nothing, so the menu theme carries on unbroken from screen to screen.
// Volume follows settings.musicVolume (0..1) and changes live from the setup screen.
//
// Music STREAMS: each track plays from an <audio> element that downloads as it plays, instead of being
// loaded at boot and decoded whole into memory (a 3-minute stereo track is ~80 MB once decoded, and the
// game has ~45 minutes of music). Only the track that's playing is ever fetched.
// The element is wired into Phaser's Web Audio output, so the volume works on iPhones (which ignore
// <audio>.volume) and the game's mute applies. Sound effects and NU's amp songs (which need exact
// timing for ON BEAT) still load and play through Phaser as before.
import { settings } from '../settings.js';

// Every music track: key 'bgm_<name>' plays public/assets/audio/music/<name>.ogg (or .mp3 where the
// browser can't play Vorbis). Add a new track's name here (tools/audio/*.py write the files).
export const TRACKS = [
  'title', 'select', 'arcade', 'sky', 'spires', 'forest', 'gravemoon', 'backrooms', 'aero', 'desert', 'slasher',
  'fractured', 'infected', 'endless_castle', 'construct', 'baseplate_4', 'baseplate_5', 'baseplate_6', 'baseplate_10',
  // the 3D stages (tools/audio/n64_stage_music.py)
  'castle_court', 'jungle_falls', 'starlight_fountain',
  // battle music sold in the shop (tools/audio/shop_music.py; 'mason' = Mason's own pixelated_audio 12)
  ...['neon', 'lofi', 'chip', 'organ', 'surf', 'jazz', 'taiko', 'dream', 'boss', 'rain', 'sugar', 'disco', 'mason',
    'noli', 'riphood', 'riphood2', 'soviet', 'korobeiniki', 'balalaika', 'troika'].map((n) => 'shop_' + n),
  // costume outro music (tools/audio/outro_music.py)
  ...['shrine', 'rosebud', 'abyss', 'dialup', 'western', 'monster', 'ragtime', 'victory', 'weather', 'cartridge', 'bride', 'ember', 'devoted', 'surf', 'tide'].map((n) => 'outro_' + n),
];
const KNOWN = new Set(TRACKS.map((n) => 'bgm_' + n));
// tracks whose file name isn't simply the key without 'bgm_'
const FILES = { endless_castle: 'endless-castle' };
export function musicExists(key) { return KNOWN.has(key); }

let ext = null;
function trackUrl(key) {
  if (!ext) ext = document.createElement('audio').canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'mp3';
  const name = key.slice(4);
  return 'assets/audio/music/' + (FILES[name] || name) + '.' + ext;
}

let current = null, currentKey = null, base = 1;
const rotation = {};                                 // playlists: which track each one starts on next time

function setVol(t, v) {
  if (t.phaser) t.phaser.setVolume(v);
  else if (t.gain) t.gain.gain.value = v;
  else t.el.volume = Math.max(0, Math.min(1, v));
}

/**
 * Music that isn't one of the streamed TRACKS but was loaded into Phaser's audio cache (e.g. the soul
 * battle themes, `soul_music_<id>` in BootScene) plays through Phaser, the way all music used to.
 * Returns a track with the same shape as makeTrack's, or null when there's no such sound.
 */
function makePhaserTrack(scene, key, loop) {
  if (!scene.cache.audio.exists(key)) return null;
  const snd = scene.sound.add(key, { loop, volume: base * settings.musicVolume });
  return { key, phaser: snd, hidden: false };
}

function makeTrack(scene, key, loop) {
  const el = new Audio(trackUrl(key));
  el.loop = loop; el.preload = 'auto';
  const t = { el, key, gain: null, src: null, hidden: false };
  const sm = scene.sound, ctx = sm.context;
  if (ctx && ctx.createMediaElementSource) {
    try {
      t.src = ctx.createMediaElementSource(el);
      t.gain = ctx.createGain();
      t.src.connect(t.gain); t.gain.connect(sm.destination || ctx.destination);
    } catch (e) { t.src = t.gain = null; }           // no Web Audio: plain <audio> volume instead
  }
  setVol(t, base * settings.musicVolume);
  return t;
}

// Browsers block audio until the first click / key press / tap: wait for Phaser's unlock, and if the
// browser still refuses, try again on the next press.
const GESTURES = ['pointerdown', 'keydown', 'touchend'];
function start(scene, t) {
  t.pending = true;
  const go = () => {
    if (current !== t) return;
    t.pending = false;
    if (t.phaser) { t.phaser.pendingPlay = false; t.phaser.play(); return; }
    const p = t.el.play();
    if (p && p.catch) p.catch(() => {
      const retry = () => { GESTURES.forEach((g) => window.removeEventListener(g, retry)); if (current === t && !t.hidden) t.el.play().catch(() => {}); };
      GESTURES.forEach((g) => window.addEventListener(g, retry));
    });
  };
  if (scene.sound.locked) { if (t.phaser) t.phaser.pendingPlay = true; scene.sound.once('unlocked', go); }
  else go();
}

function drop(t) {
  if (t.phaser) { try { t.phaser.stop(); t.phaser.destroy(); } catch (e) { /* already gone */ } return; }
  try { t.el.pause(); t.el.removeAttribute('src'); t.el.load(); } catch (e) { /* already gone */ }
  try { if (t.src) t.src.disconnect(); if (t.gain) t.gain.disconnect(); } catch (e) { /* already gone */ }
}

// The game pauses its sounds when the tab is hidden; music does the same.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!current || current.phaser) return;             // (Phaser pauses its own sounds)
    if (document.hidden) { current.hidden = !current.el.paused; if (current.hidden) current.el.pause(); }
    else if (current.hidden) { current.hidden = false; current.el.play().catch(() => {}); }
  });
}

/**
 * Plays one looping track: a streamed TRACKS key ('bgm_title'), or any music Phaser has loaded
 * ('soul_music_bill-cipher'). Asking for the track already playing does nothing.
 */
export function playMusic(scene, key, volume = 0.6) {
  if (key && key === currentKey && current) return;
  stopMusic();
  if (!key) return;
  base = volume;
  const t = KNOWN.has(key) ? makeTrack(scene, key, true) : makePhaserTrack(scene, key, true);
  if (!t) return;
  currentKey = key; current = t;
  start(scene, current);
}

// A rotating soundtrack: plays each track through once, then the next, round and round. Each time the
// same playlist is started again (the next match on that stage) it begins one track further on.
export function playPlaylist(scene, keys, volume = 0.6) {
  keys = keys.filter((k) => KNOWN.has(k));
  if (!keys.length) { stopMusic(); return; }
  const id = 'list:' + keys.join(',');
  if (id === currentKey && current) return;
  stopMusic();
  let i = rotation[id] || 0; rotation[id] = (i + 1) % keys.length;
  currentKey = id; base = volume;
  const next = () => {
    if (currentKey !== id) return;
    if (current) drop(current);
    const t = makeTrack(scene, keys[i % keys.length], false);
    i++;
    current = t;
    t.el.addEventListener('ended', () => { if (current === t) next(); });
    start(scene, t);
  };
  next();
}

export function stopMusic() {
  if (current) drop(current);
  current = null; currentKey = null;
}

/**
 * What music is on right now, for tests and debugging (it doesn't matter whether a track streams or
 * plays through Phaser): key, whether it loops, plays or waits for the browser to allow sound, and its
 * length in seconds once known.
 */
export function musicState() {
  if (!current) return { key: null, loop: false, playing: false, pending: false, duration: 0 };
  if (current.phaser) {
    const s = current.phaser;
    return { key: current.key, loop: !!s.loop, playing: !!s.isPlaying, pending: !!current.pending || !!s.pendingPlay, duration: s.duration || s.totalDuration || 0, streaming: false };
  }
  const el = current.el;
  return { key: current.key, loop: el.loop, playing: !el.paused, pending: !!current.pending, duration: Number.isFinite(el.duration) ? el.duration : 0, streaming: true };
}

export function updateMusicVolume() { if (current) setVol(current, base * settings.musicVolume); }

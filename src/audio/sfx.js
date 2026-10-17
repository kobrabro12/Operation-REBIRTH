// Tiny 8-bit sound generator. Each effect is built once into an AudioBuffer from square waves and
// stepped noise, then crushed to 8-bit, the same recipe as tools/audio/fireball_sfx.py.
import { settings } from '../settings.js';

const SR = 22050;
let ctx = null;
const cache = {};

function rand(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1; }

function build(name, seconds, fn) {
  const n = Math.floor(seconds * SR);
  const buf = ctx.createBuffer(1, n, SR);
  const d = buf.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < n; i++) { d[i] = fn(i / SR, i, n); peak = Math.max(peak, Math.abs(d[i])); }
  const k = peak > 0 ? 0.9 / peak : 1;
  let held = 0;
  for (let i = 0; i < n; i++) {                       // sample-and-hold + 8-bit steps = lo-fi crunch
    if (i % 2 === 0) held = Math.round(d[i] * k * 127) / 127;
    d[i] = held;
  }
  cache[name] = buf;
}

const sq = (phase, duty = 0.5) => ((phase % 1) < duty ? 1 : -1);

export function initSfx(scene) {
  if (ctx) return;
  ctx = scene.sound.context || new (window.AudioContext || window.webkitAudioContext)();
  const R = rand(7);
  const noiseStep = (step) => { let v = 0, c = 0; return () => { if (c-- <= 0) { v = R(); c = step; } return v; }; };

  let ph = 0, n1 = noiseStep(3);
  build('jump', 0.14, (t) => { ph += (260 + 900 * t) / SR; return sq(ph, 0.25) * (1 - t / 0.14); });
  ph = 0;
  build('djump', 0.16, (t) => { ph += (400 + 1200 * t) / SR; return sq(ph, 0.125) * (1 - t / 0.16); });
  ph = 0;
  build('swing', 0.1, (t) => n1() * (1 - t / 0.1) * 0.8);
  ph = 0; n1 = noiseStep(4);
  build('hit', 0.16, (t) => { ph += (220 * Math.exp(-t * 18) + 60) / SR; return (0.6 * sq(ph) + 0.7 * n1()) * Math.pow(1 - t / 0.16, 1.5); });
  ph = 0; n1 = noiseStep(6);
  build('bighit', 0.34, (t) => { ph += (180 * Math.exp(-t * 10) + 40) / SR; return (0.6 * sq(ph) + 0.9 * n1()) * Math.pow(1 - t / 0.34, 1.3); });
  ph = 0; n1 = noiseStep(8);
  build('ko', 1.1, (t) => { ph += (500 * Math.exp(-t * 3) + 40) / SR; return (0.5 * sq(ph) + 0.8 * n1() * Math.exp(-t * 2)) * Math.pow(1 - t / 1.1, 1.1); });
  ph = 0;
  build('land', 0.06, (t) => n1() * (1 - t / 0.06) * 0.5);
  ph = 0;
  build('shield', 0.12, (t) => { ph += 700 / SR; return sq(ph, 0.5) * (1 - t / 0.12) * 0.6; });
  ph = 0;
  build('dodge', 0.12, (t) => { ph += (900 - 3000 * t) / SR; return sq(ph, 0.25) * (1 - t / 0.12) * 0.5; });
  ph = 0; n1 = noiseStep(5);
  build('summon', 0.7, (t) => { ph += (120 + 400 * t + 40 * Math.sin(t * 60)) / SR; return (0.6 * sq(ph, 0.3) + 0.3 * n1()) * Math.sin(Math.PI * t / 0.7); });
  ph = 0;
  build('soulhit', 0.1, (t) => { ph += (600 - 2000 * t) / SR; return sq(ph, 0.25) * (1 - t / 0.1); });
  ph = 0; n1 = noiseStep(4);
  build('limit', 1.6, (t) => { ph += (60 + 30 * Math.sin(t * 20)) / SR; return (0.6 * sq(ph) + 0.6 * n1() * Math.min(1, t * 2)) * Math.pow(1 - t / 1.6, 0.8); });
  ph = 0;
  build('limitready', 0.4, (t) => { const f = t < 0.1 ? 660 : t < 0.2 ? 880 : 1320; ph += f / SR; return sq(ph, 0.25) * (1 - t / 0.4); });
  ph = 0;
  build('item', 0.22, (t) => { const f = t < 0.07 ? 880 : t < 0.14 ? 1175 : 1568; ph += f / SR; return sq(ph, 0.5) * 0.6; });
  ph = 0;
  build('curse', 0.4, (t) => { ph += (300 - 500 * t) / SR; return sq(ph, 0.5) * (1 - t / 0.4) * 0.7; });
  ph = 0; n1 = noiseStep(2);
  build('thunder', 0.8, (t) => (n1() * 0.9 + 0.3 * sq((ph += 50 / SR))) * Math.exp(-t * 4));
  ph = 0;
  build('warn', 0.3, (t) => { ph += 1000 / SR; return sq(ph) * (Math.floor(t * 20) % 2) * 0.5; });
  ph = 0;
  build('menu', 0.06, (t) => { ph += 1200 / SR; return sq(ph, 0.25) * 0.5; });
  ph = 0;
  build('select', 0.18, (t) => { ph += (t < 0.06 ? 880 : 1320) / SR; return sq(ph, 0.25) * 0.6; });
  ph = 0;
  build('go', 0.5, (t) => { ph += (t < 0.25 ? 523 : 1046) / SR; return sq(ph, 0.5) * 0.6 * (1 - t / 0.5); });
}

// the title screen's demo match plays silently
let muted = false;
export function setSfxMuted(m) { muted = !!m; }

export function sfx(name, volume = 1, rate = 1) {
  if (!ctx || !cache[name] || settings.sfxVolume <= 0 || muted) return;
  if (ctx.state === 'suspended') ctx.resume();
  const src = ctx.createBufferSource();
  src.buffer = cache[name];
  src.playbackRate.value = rate;
  const g = ctx.createGain();
  g.gain.value = volume * settings.sfxVolume * 0.5;
  src.connect(g).connect(ctx.destination);
  src.start();
}

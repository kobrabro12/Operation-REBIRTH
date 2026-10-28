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
  // ---- weapon sounds (each fighter's swings and hits) and costume extras
  let ph2 = 0;
  ph = 0; n1 = noiseStep(1);
  build('slash', 0.15, (t) => { ph += (2600 - 6000 * t) / SR; return n1() * Math.pow(1 - t / 0.15, 2) * 0.8 + sq(ph, 0.5) * 0.18 * Math.exp(-t * 25); });   // steel swish
  ph = 0; ph2 = 0; n1 = noiseStep(2);
  build('clang', 0.3, (t) => { ph += 1310 / SR; ph2 += 1975 / SR; return (sq(ph) * 0.35 + sq(ph2, 0.3) * 0.25) * Math.exp(-t * 14) + n1() * 0.5 * Math.exp(-t * 60); });   // sword striking armour
  ph = 0; n1 = noiseStep(6);
  build('staff', 0.17, (t) => { ph += (150 * Math.exp(-t * 8) + 50) / SR; return n1() * 0.55 * Math.sin(Math.PI * t / 0.17) + sq(ph) * 0.45 * Math.exp(-t * 18); });   // heavy staff whoosh / thud
  ph = 0; n1 = noiseStep(1);
  { let c = 0, v = 0; build('flame', 0.22, (t) => { if (c-- <= 0) { v = R(); c = 1 + Math.floor(Math.abs(R()) * 5); } ph += 85 / SR; return (v * 0.75 + sq(ph) * 0.15) * Math.sin(Math.PI * t / 0.22); }); }   // crackling soul-fire whoosh
  ph = 0; ph2 = 0; n1 = noiseStep(1);
  build('shing', 0.55, (t) => { ph += 3150 / SR; ph2 += 4720 / SR; return (sq(ph, 0.5) * 0.3 + sq(ph2, 0.25) * 0.2) * Math.exp(-t * 6) * Math.min(1, t * 400) + n1() * 0.4 * Math.exp(-t * 90); });   // katana ring
  { let step = 1, c = 0, v = 0; build('whoosh', 0.2, (t) => { if (c-- <= 0) { v = R(); c = step; step = 1 + Math.floor(t * 30); } return v * Math.sin(Math.PI * t / 0.2) * 0.8; }); }   // ninja swish
  ph = 0;
  build('shuriken', 0.32, (t) => { ph += (980 + 120 * Math.sin(t * 90)) / SR; return sq(ph, 0.25) * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 28)) * 0.5 * (1 - t / 0.32); });   // whirring spin
  n1 = noiseStep(5);
  build('smoke', 0.32, (t) => n1() * Math.exp(-t * 9) * 0.8);   // smoke-bomb poof
  ph = 0; n1 = noiseStep(9);
  build('taiko', 0.6, (t) => { ph += (75 * Math.exp(-t * 3) + 45) / SR; return sq(ph) * 0.7 * Math.exp(-t * 6) + n1() * 0.4 * Math.exp(-t * 30); });   // big drum
  ph = 0; n1 = noiseStep(3);
  build('petal', 0.22, (t) => { ph += 1500 / SR; return (n1() * 0.45 + sq(ph, 0.125) * 0.08) * Math.sin(Math.PI * t / 0.22); });   // soft rustle of petals
  { let c = 0, f = 600; ph = 0; build('glitch', 0.2, (t) => { if (c-- <= 0) { f = 200 + Math.floor(Math.abs(R()) * 8) * 180; c = Math.floor(SR * 0.016); } ph += f / SR; return sq(ph) * 0.5 * (Math.floor(t * 60) % 3 ? 1 : 0); }); }   // 1-bit stutter
  // stage hazards
  n1 = noiseStep(1); build('geyser', 0.9, (t) => n1() * Math.min(1, t * 12) * Math.exp(-t * 2.2) * 0.8);   // water bursting up
  n1 = noiseStep(14); build('rumble', 0.8, (t) => n1() * (0.5 + 0.5 * Math.sin(t * 50)) * Math.min(1, t * 6) * (1 - t / 0.8));   // rolling rock
  ph = 0; build('laser', 0.45, (t) => { ph += (1400 * Math.exp(-t * 2) + 300 + 60 * Math.sin(t * 160)) / SR; return sq(ph, 0.25) * 0.55 * (1 - t / 0.45); });   // eye beam
  ph = 0; build('bats', 0.5, (t) => { ph += (2400 + 900 * Math.sin(t * 90)) / SR; return sq(ph, 0.125) * 0.35 * (Math.floor(t * 28) % 2) * (1 - t / 0.5); });   // squeaking wings
  ph = 0;
  build('go', 0.5, (t) => { ph += (t < 0.25 ? 523 : 1046) / SR; return sq(ph, 0.5) * 0.6 * (1 - t / 0.5); });
  // WHAT ONCE WAS (test fighter): the Backrooms' fluorescent hum, an elevator's ding, glass breaking
  ph = 0; n1 = noiseStep(2);
  build('buzz', 0.7, (t) => { ph += 120 / SR; return (sq(ph, 0.5) * 0.35 + n1() * 0.12) * Math.min(1, t * 20) * (1 - t / 0.7) * (Math.floor(t * 90) % 7 ? 1 : 0.25); });
  ph = 0; ph2 = 0;
  build('ding', 0.8, (t) => { ph += 1318 / SR; ph2 += 1046 / SR; return (t < 0.3 ? sq(ph, 0.5) : sq(ph2, 0.5)) * 0.4 * Math.exp(-(t < 0.3 ? t : t - 0.3) * 6); });
  ph = 0; n1 = noiseStep(1);
  build('glass', 0.3, (t) => { ph += (3200 + 900 * Math.sin(t * 300)) / SR; return n1() * 0.6 * Math.exp(-t * 14) + sq(ph, 0.25) * 0.2 * Math.exp(-t * 18); });
  // INFECTED.EXE: a tinny 'ha-ha-ha-ha', the pop-up error bonk, a new-mail chime
  ph = 0;
  build('laugh', 0.9, (t) => { const k = Math.floor(t * 9), u = (t * 9) % 1; ph += (900 - k * 40 + 260 * Math.exp(-u * 6)) / SR; return sq(ph, 0.3) * 0.5 * (u < 0.62 ? Math.min(1, u * 30) * (1 - u / 0.62) : 0) * (k < 7 ? 1 : 0); });
  { let sp = 0; const r = rand(4077); build('scream', 1.4, (t) => { sp += (1150 + 240 * Math.sin(t * 46) + 160 * Math.sin(t * 7.3) - 260 * t) / SR; const env = Math.min(1, t * 25) * (t > 1.05 ? (1.4 - t) / 0.35 : 1); return (sq(sp, 0.35) * 0.55 + sq(sp * 0.503, 0.5) * 0.2 + r() * 0.35) * env; }); }   // SEEN's SCREAM: a warbling shriek through torn speakers
  { let ph = 0, lp = 0, lp2 = 0; const r = rand(911); build('roar', 1.9, (t) => { ph += (78 + 22 * Math.sin(t * 2.7) + 9 * Math.sin(t * 41) - 18 * t) / SR; lp += (r() - lp) * 0.09; lp2 += (lp - lp2) * 0.2; const saw = 2 * (ph % 1) - 1, am = 0.65 + 0.35 * Math.sin(t * 2 * Math.PI * 27), env = Math.min(1, t * 9) * (t > 1.3 ? Math.max(0, (1.9 - t) / 0.6) : 1); return Math.max(-1, Math.min(1, (saw * 0.55 + lp2 * 2.2 + sq(ph * 0.5, 0.5) * 0.2) * am * env * 1.3)); }); }   // WHAT ONCE WAS: a roar from behind the screen - a growling, rumbling low saw through noise
  // the shop's AIRHORN KOS extra: three short blasts and a long one, a brassy chord of three detuned saws
  { let p1 = 0, p2 = 0, p3 = 0; build('airhorn', 1.3, (t) => { p1 += 466 / SR; p2 += 587 / SR; p3 += 698 / SR; const on = t < 0.13 || (t > 0.18 && t < 0.31) || (t > 0.36 && t < 0.49) || (t > 0.56 && t < 1.25); const v = ((2 * (p1 % 1) - 1) + (2 * (p2 % 1) - 1) + (2 * (p3 % 1) - 1)) / 3; return on ? Math.max(-0.8, Math.min(0.8, v * 1.6)) * (t > 1.1 ? (1.25 - t) / 0.15 : 1) : 0; }); }
  ph = 0; ph2 = 0;
  build('popup', 0.35, (t) => { ph += 392 / SR; ph2 += 494 / SR; return (sq(ph, 0.5) + sq(ph2, 0.5)) * 0.3 * Math.exp(-t * 7); });
  ph = 0;
  build('mail', 0.6, (t) => { ph += (t < 0.14 ? 1568 : t < 0.28 ? 1175 : 1760) / SR; return sq(ph, 0.25) * 0.4 * Math.exp(-((t % 0.14) * 9)) * (t < 0.42 ? 1 : 0); });
  // WHAT ONCE WAS in DIAL-UP: a modem dialling in - touch tones, the answer whistle, then the screech
  ph = 0; ph2 = 0; n1 = noiseStep(3);
  const DTMF = [[697, 1209], [770, 1336], [852, 1477], [941, 1336]];
  build('dialup', 1.6, (t) => {
    if (t < 0.48) { const k = Math.floor(t / 0.12), u = t % 0.12; if (u > 0.08) return 0; ph += DTMF[k][0] / SR; ph2 += DTMF[k][1] / SR; return (Math.sin(ph * 6.283) + Math.sin(ph2 * 6.283)) * 0.35; }
    if (t < 0.85) { ph += 2100 / SR; return Math.sin(ph * 6.283) * 0.5 * (Math.floor(t * 30) % 9 ? 1 : 0.2); }
    const w = 1200 + 900 * Math.sin(t * 90) + 400 * Math.sin(t * 13); ph += w / SR; ph2 += (w * 1.5) / SR;
    return (sq(ph, 0.5) * 0.3 + sq(ph2, 0.3) * 0.15 + n1() * 0.25) * (t > 1.45 ? (1.6 - t) / 0.15 : 1);
  });
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

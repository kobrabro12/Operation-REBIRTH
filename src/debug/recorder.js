// DEBUG RECORDING: records a match so a bug can be shown, not just described.
//
// Turn it on in TRAINING (button / key 8: RECORD FOR DEBUGGING - the training match restarts recording),
// or for every match with ?debug=1 in the URL. While recording:
//   8  MARK A BUG   - remembers this moment (+ a screenshot and an optional note)
//   9  SAVE         - downloads rebirth-recording-<date>.zip and stops recording
// The zip holds recording.json (setup, save data, every button press per frame, a state checkpoint
// every half second, marks, errors) and shots/ (a screenshot every 2 seconds - the last 3 minutes - and
// one at every mark). Hand it to Claude with "the bug is at mark 2"; `npm run replay -- file.zip`
// replays the match frame for frame (tools/replay/replay.mjs).
//
// Why it can replay: match logic runs on frame counts and Math.random only (AGENTS.md: Testing). While
// recording, Math.random gives match logic (setting up the match, every simulation step, training
// buttons) numbers from a seeded sequence, and everything else (drawing, Phaser's own effects, which run
// on real time) numbers from a separate one - so only the logic's numbers have to repeat. It also records
// the human players' controller state every frame, how many steps ran between draws (some hurtboxes
// follow the last drawn animation frame) and when a training button was used.
import { settings } from '../settings.js';
import { BUTTONS } from '../input/controllers.js';
import { seededRandom, newSeed } from './rng.js';
import { makeZip } from './zip.js';

const CHECK_EVERY = 30;          // frames between state checkpoints (the replay compares them)
const TRACE_FRAMES = 600;        // for the first 10 s, every frame's random-number count and state fingerprint
const SHOT_EVERY = 120;          // frames between regular screenshots (2 s at normal speed)
const KEEP_SHOTS = 90;           // regular screenshots kept (the last 3 minutes); marked ones are always kept
const MAX_FRAMES = 60 * 60 * 30; // stop recording after 30 minutes of play, to keep the file small
const TRAINING_ACTIONS = ['reset', 'fillLimit', 'cycleDummy', 'toggleHitboxes', 'cycleDamage', 'cycleSpeed'];
const GAME_COMMIT = typeof __GAME_COMMIT__ !== 'undefined' ? __GAME_COMMIT__ : 'dev';   // set by vite.config.js

/** Should this match be recorded? Never the title demo or a shop preview. */
export function recordingWanted(match) {
  if (match.demo || match.shopPreview) return false;
  let url = false;
  try { url = /[?&](debug|record)=1\b/.test(location.search); } catch (e) { /* no location (tests) */ }
  return url || !!settings.debugRecord;
}

/** Rounds to a fixed number of decimals, to keep checkpoints compact. */
const r2 = (v) => Math.round(v * 100) / 100;

/** A short text summary of every fighter's position, speed, damage and state, to compare frame by frame. */
export function fingerprint(m) {
  return m.fighters.map((f) => [r2(f.x), r2(f.y), r2(f.vx), r2(f.vy), r2(f.percent), f.state, f.t].join(',')).join('|');
}

/**
 * One match's DEBUG RECORDING: made by MatchScene.create when recordingWanted(), saved as a .zip with
 * save(). See the top of this file for what it records and how the replay uses it.
 */
export class Recorder {
  /**
   * Starts recording a match. Call at the top of MatchScene.create, before anything uses Math.random,
   * so the seed covers every random choice of the match.
   * @param {Phaser.Scene} match - the MatchScene being created
   * @param {object} setup - the settings the match is built from
   */
  constructor(match, setup) {
    this.match = match;
    this.seed = newSeed();
    this.realRandom = Math.random;
    // match logic gets the seeded numbers (from here to the end of create, and inside every tick);
    // drawing and everything else keeps getting ordinary random numbers
    this.logicRandom = seededRandom(this.seed);
    this.inLogic = true;
    this.logicCalls = 0;
    // (globalThis.__randomSpy, when set, is called for every seeded number - a debugging aid to see who uses them)
    Math.random = () => { if (!this.inLogic) return this.realRandom(); this.logicCalls++; if (globalThis.__randomSpy) globalThis.__randomSpy(); return this.logicRandom(); };
    this.trace = [];
    this.setup = JSON.parse(JSON.stringify(setup));
    this.storage = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('rebirth.')) this.storage[k] = localStorage.getItem(k); } } catch (e) { /* no storage */ }
    this.startedAt = new Date().toISOString();
    this.inputs = []; this.last = {}; this.draws = []; this.events = []; this.checkpoints = [];
    this.marks = []; this.errors = []; this.shots = []; this.ticksSinceDraw = 0; this.stopped = false;
  }

  /**
   * Hooks into the finished match: the human players' controllers, tick, draw and training buttons.
   * Call at the end of MatchScene.create.
   */
  attach() {
    // From here on only match logic may use the seeded numbers. That includes Phaser itself: it draws a
    // random number for the internal id of every object it creates, so the recorder's own objects (the
    // REC badge) must be made outside the seeded stream, or the replay - which has no badge - drifts.
    this.inLogic = false;
    const m = this.match;
    this.fighters = m.fighters.map((f, i) => ({ slot: i, id: f.def.id, skin: f.skin, label: f.label, cpu: !!f.isCpu }));
    for (const [i, f] of m.fighters.entries()) {
      if (f.isCpu) continue;
      const poll = f.ctrl.poll.bind(f.ctrl);
      f.ctrl.poll = () => { poll(); this.capture(i, f.ctrl); };
    }
    const tick = m.tick.bind(m), draw = m.draw.bind(m);
    m.tick = () => { this.inLogic = true; try { tick(); } finally { this.inLogic = false; } this.afterTick(); };
    m.draw = () => { draw(); this.afterDraw(); };
    if (m.training) {
      for (const a of TRAINING_ACTIONS) {
        const fn = m.training[a].bind(m.training);
        m.training[a] = (...args) => { this.event('training', a); this.inLogic = true; try { return fn(...args); } finally { this.inLogic = false; } };
      }
    }
    this.onKey = (e) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (this.stopped) return;
      if (e.key === '8') { this.mark(); if (m.training) m.training.labels(); }
      else if (e.key === '9') this.save();
    };
    this.onError = (e) => this.error(e.message || String(e), e.error && e.error.stack);
    this.onRejection = (e) => this.error('unhandled promise: ' + (e.reason && e.reason.message || e.reason), e.reason && e.reason.stack);
    this.realConsoleError = console.error;
    console.error = (...a) => { this.error(a.map(String).join(' ')); this.realConsoleError.apply(console, a); };
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('error', this.onError);
    window.addEventListener('unhandledrejection', this.onRejection);
    m.events.once('shutdown', () => this.detach());
    this.badge = m.add.text(m.scale.width - 8, 22, '', { fontFamily: '"Press Start 2P", monospace', fontSize: '6px', color: '#ff5a5a', stroke: '#0b0a14', strokeThickness: 3 }).setOrigin(1, 0).setDepth(30);
    if (m.addUI) m.addUI(this.badge);
    this.updateBadge();
  }

  /** Puts Math.random, console.error and the listeners back when the match ends. */
  detach() {
    Math.random = this.realRandom;
    if (this.realConsoleError) console.error = this.realConsoleError;
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('error', this.onError);
    window.removeEventListener('unhandledrejection', this.onRejection);
  }

  /** Records one player's controller state for this frame, only when it changed since last frame. */
  capture(slot, c) {
    if (this.stopped) return;
    let mask = 0;
    BUTTONS.forEach((b, i) => { if (c.cur[b]) mask |= 1 << i; });
    const key = c.x + ',' + c.y + ',' + mask;
    if (this.last[slot] === key) return;
    this.last[slot] = key;
    this.inputs.push([this.match.frame, slot, c.x, c.y, mask]);
  }

  /** After every simulation step: count it for the draw pattern, and take a checkpoint now and then. */
  afterTick() {
    if (this.stopped) return;
    const m = this.match;
    this.ticksSinceDraw++;
    if (m.frame <= TRACE_FRAMES) this.trace.push([m.frame, this.logicCalls, fingerprint(m)]);
    if (m.frame % CHECK_EVERY === 0) {
      this.checkpoints.push([m.frame, m.fighters.map((f) => [r2(f.x), r2(f.y), r2(f.vx), r2(f.vy), r2(f.percent), f.state, f.stocks])]);
    }
    if (m.frame >= MAX_FRAMES) { this.stopped = true; this.updateBadge('REC FULL - 9 SAVE'); }
  }

  /** After every draw: remember how many steps ran before it (replays repeat exactly this pattern). */
  afterDraw() {
    if (this.stopped) return;
    const n = this.ticksSinceDraw, last = this.draws[this.draws.length - 1];
    if (last && last[0] === n) last[1]++; else this.draws.push([n, 1]);
    this.ticksSinceDraw = 0;
    const f = this.match.frame;
    if (n > 0 && f - (this.lastShot || -SHOT_EVERY) >= SHOT_EVERY) { this.lastShot = f; this.shoot(f, false); }
    if (f % 60 === 0) this.updateBadge();
  }

  /** Something happened between frames that the replay has to repeat (e.g. a training button). */
  event(type, action) { if (!this.stopped) this.events.push({ frame: this.match.frame, type, action }); }

  /** An error while playing: kept with its frame, and marked so it's easy to find. */
  error(message, stack) {
    if (this.errors.length > 200) return;
    this.errors.push({ frame: this.match.frame, message: String(message).slice(0, 500), stack: stack ? String(stack).split('\n').slice(0, 8).join('\n') : undefined });
    if (this.errors.length === 1) this.mark('error: ' + String(message).slice(0, 80), true);
  }

  /**
   * Captures the screen at the next render as a JPEG.
   * @param {number} frame - the match frame it belongs to
   * @param {boolean} keep - marked shots are always kept; regular ones roll over after KEEP_SHOTS
   */
  shoot(frame, keep) {
    const r = this.match.game.renderer;
    if (!r || !r.snapshot) return null;
    const entry = { frame, file: 'shots/f' + String(frame).padStart(6, '0') + (keep ? '-mark' : '') + '.jpg', keep, data: null };
    this.shots.push(entry);
    r.snapshot((img) => {
      try {
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        c.toBlob((b) => { if (b) b.arrayBuffer().then((buf) => { entry.data = new Uint8Array(buf); }); }, 'image/jpeg', 0.82);
      } catch (e) { /* tainted or lost context: no picture */ }
    }, 'image/png');
    const regular = this.shots.filter((s) => !s.keep);
    if (regular.length > KEEP_SHOTS) this.shots.splice(this.shots.indexOf(regular[0]), 1);
    return entry.file;
  }

  /**
   * MARK A BUG: remembers this moment with a screenshot and an optional note from the player.
   * @param {string} [note] - given for automatic marks (errors); asked for otherwise
   * @param {boolean} [auto] - true when the game marked it itself
   */
  mark(note, auto) {
    if (this.stopped) return;
    const frame = this.match.frame;
    if (!auto && note === undefined) {
      try { note = window.prompt('MARK ' + (this.marks.length + 1) + ': what went wrong? (optional)', '') || ''; } catch (e) { note = ''; }
    }
    this.marks.push({ n: this.marks.length + 1, frame, time: this.clock(frame), note: note || '', auto: !!auto, shot: this.shoot(frame, true) });
    this.updateBadge();
  }

  /** "m:ss" of game time for a frame. */
  clock(frame) { const s = Math.floor(frame / 60); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

  /** Shows REC, the time and the number of marks in the corner. */
  updateBadge(text) {
    if (!this.badge) return;
    this.badge.setText(text || ('● REC ' + this.clock(this.match.frame) + (this.marks.length ? '  MARKS ' + this.marks.length : '') + '  8 MARK  9 SAVE'));
  }

  /** Everything about the recording except the pictures, as the replay tool reads it. */
  toJSON() {
    return {
      format: 'operation-rebirth-recording', version: 1,
      game: { commit: GAME_COMMIT, url: (() => { try { return location.href; } catch (e) { return ''; } })(), userAgent: navigator.userAgent, screen: [screen.width, screen.height, devicePixelRatio] },
      startedAt: this.startedAt, frames: this.match.frame, seed: this.seed,
      mode: this.match.mode, stage: this.match.stageId, training: !!this.match.training, soulBattle: !!this.match.soulBattle,
      setup: this.setup, storage: this.storage, fighters: this.fighters,
      buttons: BUTTONS, inputs: this.inputs, draws: this.draws, events: this.events, checkpoints: this.checkpoints, trace: this.trace,
      marks: this.marks, errors: this.errors, shots: this.shots.filter((s) => s.data).map((s) => ({ frame: s.frame, file: s.file, mark: s.keep })),
    };
  }

  /** SAVE: downloads the recording as a zip and stops recording. */
  save() {
    if (this.saved) return null;
    this.saved = true; this.stopped = true;
    settings.debugRecord = false;
    const json = this.toJSON();
    const readme = [
      'Operation REBIRTH debug recording', '',
      `Recorded ${json.startedAt}, ${this.clock(json.frames)} of play, ${json.marks.length} mark(s), ${json.errors.length} error(s).`, '',
      'Marks:', ...json.marks.map((m) => `  ${m.n}. ${m.time} (frame ${m.frame})${m.auto ? ' [auto]' : ''} ${m.note}`), '',
      'To report a bug: give this zip to Claude and say which mark (or time) the problem is at.',
      'To replay it frame for frame: npm run replay -- <this zip>   (tools/replay/replay.mjs)',
    ].join('\n');
    const files = [{ name: 'recording.json', data: JSON.stringify(json) }, { name: 'README.txt', data: readme }];
    for (const s of this.shots) if (s.data) files.push({ name: s.file, data: s.data });
    const url = URL.createObjectURL(makeZip(files)), a = document.createElement('a');
    a.href = url; a.download = 'rebirth-recording-' + json.startedAt.replace(/[:.]/g, '-').slice(0, 19) + '.zip';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    this.updateBadge('SAVED ' + a.download);
    if (this.match.training && this.match.training.labels) this.match.training.labels();
    return json;
  }
}

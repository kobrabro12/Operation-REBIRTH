// COSTUME SHEETS ON DEMAND. A costume with its own drawing (skins.js `sheetSet`) has a full set of strips -
// run, jump, fall, moves... - and together they were over half of the game's texture memory (~550 MB).
// Menus only ever show a costume's idle strip, so BootScene loads just that; the rest of a costume's strips
// load when something needs them: a match (MatchScene.preload), a win cutscene (WinScene.preload) or the
// shop's costume PREVIEW. Starting a match also drops the costume strips no fighter in it is wearing, so
// memory stays at "what this match uses" however many costumes you try.
// Rules: a key from a fighter's base `sheets` (or its other forms' base sheets, worn stages, bodies, menu
// sheets) is never put off. A new costume needs nothing extra: anything in a def's `costumeSheets` is
// handled, and a skin's `form:` (Rosemary's RED ARMY tank) brings that form's sheets with it.
import { ROSTER, TEST_ROSTER, fighterById } from './roster.js';
import { skinInfo, resolveSkins } from './skins.js';
import { MOBILE_ATLASES } from '../mobileAtlasManifest.js';
import { useAtlases } from '../mobileTextures.js';

const NATIVE_RANDOM = Math.random;     // loading uses this, so a seeded match (sim, replays) draws the same numbers either way
const deferred = new Map();            // texture key -> { url, config } as BootScene asked for it
let groups = null;                     // 'fighter:set' -> [texture keys], built on first use

/** Every texture key in a table of sheets ({ idle: 'ss_idle', ... }), or in a list of them. */
function keysOf(sheets) {
  if (!sheets) return [];
  if (Array.isArray(sheets)) return sheets.flatMap(keysOf);
  return Object.values(sheets).filter((k) => typeof k === 'string');
}

/**
 * Builds the costume groups from the fighter defs: each `costumeSheets[set]` (of the fighter and of its other
 * forms - FULL AERO, SEEN) is the group 'id:set' (all but its idle strip), each `forms[name]` is 'id:form:name'.
 * @returns {Map<string, string[]>}
 */
function costumeGroups() {
  if (groups) return groups;
  groups = new Map();
  const always = new Set(), add = (g, keys) => { const l = groups.get(g) || []; for (const k of keys) if (!l.includes(k)) l.push(k); groups.set(g, l); };
  for (const { def } of [...ROSTER, ...TEST_ROSTER]) {
    const nested = [def, def.fullAero, def.wrongDef].filter(Boolean);
    for (const d of nested) {
      for (const k of [...keysOf(d.sheets), ...keysOf(d.wornSheets), ...keysOf(d.sludgeSheets), ...keysOf(d.menuSheets), ...Object.values(d.bodySheets || {}).flatMap(keysOf)]) always.add(k);
      for (const [set, sh] of Object.entries(d.costumeSheets || {})) add(def.id + ':' + set, Object.entries(sh).filter(([n]) => n !== 'idle').map(([, k]) => k));
    }
    for (const [name, f] of Object.entries(def.forms || {})) {
      add(def.id + ':form:' + name, keysOf(f.sheets));
      for (const [set, sh] of Object.entries(f.costumeSheets || {})) add(def.id + ':' + set, keysOf(sh));
    }
  }
  for (const [g, l] of groups) groups.set(g, l.filter((k) => !always.has(k)));
  return groups;
}

/** The groups one fighter in one costume needs. */
function groupsFor(id, skin) {
  const info = skinInfo(id, skin || 0), out = [];
  if (info.sheetSet) out.push(id + ':' + info.sheetSet);
  if (info.form) out.push(id + ':form:' + info.form);
  return out;
}

/**
 * Makes BootScene put off loading costume strips (call it at the top of BootScene.preload, after
 * installMobileTextures): they're remembered here and loaded later by queueSheets.
 */
export function deferCostumeSheets(scene) {
  const all = new Set([...costumeGroups().values()].flat());
  if (/[?&]lazySheets=0\b/.test(globalThis.location?.search || '')) return;   // ?lazySheets=0 loads everything at boot, to compare
  const load = scene.load, original = load.spritesheet.bind(load);
  load.spritesheet = (key, url, config, ...rest) => {
    if (typeof key === 'string' && all.has(key)) { deferred.set(key, { url, config }); return load; }
    return original(key, url, config, ...rest);
  };
}

/**
 * Queues the costume strips a set of fighters needs on a scene's loader (from preload, Phaser then loads them
 * before create). With `evict`, costume strips nobody in the list wears are removed first.
 * @param {Phaser.Scene} scene
 * @param {{id: string, skin: number}[]} picks - fighters and the costume each wears
 * @param {{evict?: boolean}} [opts]
 * @returns {number} how many strips were queued (0 = all there already)
 */
export function queueSheets(scene, picks, opts = {}) {
  const G = costumeGroups(), want = new Set();
  for (const p of picks) for (const g of groupsFor(p.id, p.skin)) for (const k of G.get(g) || []) if (deferred.has(k)) want.add(k);
  if (opts.evict) for (const k of deferred.keys()) if (!want.has(k) && scene.textures.exists(k)) scene.textures.remove(k);
  const atlases = useAtlases(), queued = [];
  for (const k of want) {
    if (scene.textures.exists(k)) continue;
    const spec = atlases && MOBILE_ATLASES[k], d = deferred.get(k);
    if (spec) scene.load.atlas(k, spec.image, spec.json); else scene.load.spritesheet(k, d.url, d.config);
    queued.push(k);
  }
  if (queued.length) {
    const seeded = Math.random;
    Math.random = NATIVE_RANDOM;
    scene.load.once('complete', () => {
      Math.random = seeded;
      for (const k of queued) if (MOBILE_ATLASES[k] && scene.textures.exists(k)) scene.textures.get(k).customData.mobileAtlas = MOBILE_ATLASES[k].original;
    });
  }
  return queued.length;
}

/**
 * Loads what a set of fighters needs outside preload (the shop's PREVIEW).
 * @returns {Promise|null} null when everything is there already (go ahead now), else a promise that
 *   resolves once the strips have loaded
 */
export function ensureSheets(scene, picks, opts = {}) {
  if (!queueSheets(scene, picks, opts)) return null;
  return new Promise((done) => { scene.load.once('complete', done); scene.load.start(); });
}

/**
 * Every fighter + costume a match setup could use, without drawing random numbers: a RANDOM pick counts as
 * each fighter it could turn out to be (MatchScene decides later, in create).
 * @param {object} S - the match settings (picks, skins, cpuCount, extraPads)
 * @param {{demo?: boolean, shopPreview?: boolean, soulSkin?: number}} how
 */
export function matchPicks(S, how = {}) {
  const avail = ROSTER.filter((f) => f.available).map((f) => f.id);
  const humans = (how.demo ? 0 : 1) + (S.extraPads || []).length, slots = Math.min(4, humans + (S.cpuCount || 0));
  const options = [];
  for (let i = 0; i < slots; i++) { const id = S.picks && S.picks[i]; options.push(id && id !== 'random' ? [fighterById(id).id] : avail); }
  const out = [], seen = new Set();
  const visit = (i, ids) => {
    if (out.length > 200) return;
    if (i === slots) {
      const skins = how.shopPreview ? [...(S.skins || [])] : resolveSkins(ids, S.skins || []);
      if (how.soulSkin !== undefined) skins[1] = how.soulSkin;
      ids.forEach((id, j) => { const k = id + '/' + (skins[j] || 0); if (!seen.has(k)) { seen.add(k); out.push({ id, skin: skins[j] || 0 }); } });
      return;
    }
    for (const id of options[i]) visit(i + 1, [...ids, id]);
  };
  visit(0, []);
  return out;
}

/** True when a fighter in a costume would have strips to load first (used to keep the title demo instant). */
export function needsLoading(scene, id, skin) {
  const G = costumeGroups();
  return groupsFor(id, skin).some((g) => (G.get(g) || []).some((k) => deferred.has(k) && !scene.textures.exists(k)));
}

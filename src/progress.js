// Milestone progress: how many KOs each fighter has scored, remembered in this browser.
// Every 25 KOs with a fighter unlocks one of their four milestone costumes (25 / 50 / 75 / 100).
// Only KOs scored by a human player in a real match count (not training, not CPUs, not self-destructs).
//
// Testing: open the game with ?kos=100 (or any number) to set every fighter's count, ?kos=0 to reset.

const KEY = 'rebirth.kos';
export const MILESTONE_KOS = [0, 25, 50, 75, 100];
let kos = {};
try { kos = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { kos = {}; }

function save() { try { localStorage.setItem(KEY, JSON.stringify(kos)); } catch (e) { /* storage unavailable */ } }

try {
  const q = new URLSearchParams(window.location.search).get('kos');
  if (q !== null && !isNaN(+q)) { for (const id of ['soul-summoner', 'mr-wake', 'hero-knight']) kos[id] = Math.max(0, Math.floor(+q)); save(); }
} catch (e) { /* no URL */ }

export function getKOs(id) { return kos[id] || 0; }

// Add one KO; returns the milestone tier newly reached (1-4), or 0.
export function addKO(id) {
  const before = getKOs(id);
  kos[id] = before + 1; save();
  const tier = MILESTONE_KOS.indexOf(kos[id]);
  return tier > 0 ? tier : 0;
}

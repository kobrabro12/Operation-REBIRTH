// Every fighter slot shown on the fighter select screen, in grid order.
// Locked entries are placeholders for fighters still being made.
import { SOUL_SUMMONER } from './soulSummoner.js';

export const ROSTER = [
  { id: 'soul-summoner', name: 'SOUL SUMMONER', def: SOUL_SUMMONER, available: true },
  { id: 'mr-wake', name: 'MR WAKE', available: false },
];

export const GRID_SLOTS = 12;          // tiles on the select grid; empty ones show as "???"

export function fighterById(id) {
  const avail = ROSTER.filter((f) => f.available);
  if (id === 'random' || !id) return avail[Math.floor(Math.random() * avail.length)];
  return ROSTER.find((f) => f.id === id && f.available) || avail[0];
}

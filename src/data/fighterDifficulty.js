// HOW HARD? - how hard each fighter is to PLAY (hands: timing, inputs, execution) and to LEARN (head: how much there
// is to know before they make sense), 1 to 5 each, with what makes them hard and how to get good. Shown on its own
// page of THE DOSSIERS (FilesScene: the file's second page, and a tag on the first) and in THE RECORDS OFFICE's
// fighter files (records.js). A new fighter = an entry here.

// the rank a fighter gets from the harder of its two numbers
export const RANKS = ['', 'EASY', 'STRAIGHTFORWARD', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
// each rank's colour on the page
export const RANK_COLORS = ['#ffffff', '#7aff9a', '#9ae0ff', '#ffd23f', '#ff9a4a', '#ff4a6a'];

export const HOW_HARD = {
  'soul-summoner': { play: 2, learn: 2,
    hard: 'Charging the fireball while staying safe, and knowing when a SOUL HEX possession is worth the risk.',
    tips: 'Charge at range, release early to poke. Summon souls before the fight comes to you. A good first fighter.' },
  'mr-wake': { play: 2, learn: 3,
    hard: 'He is slow up close. His VOID ORB and bolts have to be placed, not just thrown.',
    tips: 'Fight from the edge of your range. Use the orb to block the way in, and save UNDERTOW for when they are near the edge.' },
  'hero-knight': { play: 2, learn: 3,
    hard: 'Throwing her sword leaves her unarmed until she gets it back. GRAND SLAM\'s reflect needs reading the shot.',
    tips: 'Only throw the sword when you can walk to it. Hold GRAND SLAM in front of projectiles - it bats them back.' },
  nu: { play: 3, learn: 3,
    hard: 'ON BEAT: attacks started on the beat ring hit harder and build his STREAK - you play him to the rhythm.',
    tips: 'Watch the ring at his feet, not the music. Start every attack on it and the STREAK carries the fight.' },
  aero: { play: 3, learn: 3,
    hard: 'His computers power him up only while he stands near them, and two out turns his Limit into FULL AERO.',
    tips: 'Plant computers where you want to fight. Two out before you fire the Limit and he stays FULL AERO until KO\'d.' },
  gnash: { play: 3, learn: 3,
    hard: 'AXE THROW leaves him fighting with his fists until he walks back over the axe. PSYCHO has to be spent well.',
    tips: 'Throw the axe only to finish or to cover a gap. Save a full PSYCHO meter for the special that will land.' },
  lumen: { play: 4, learn: 3,
    hard: 'Floaty, and her best damage is in stars she has to lay out first, then CONSTELLATE when someone is on the lines.',
    tips: 'Keep two stars out at all times. STARBLINK to a star to get your up special back. Lines first, then the burst.' },
  vanta: { play: 4, learn: 4,
    hard: 'IAI\'s PERFECT DRAW is a tiny timing window; GHOST DASH chains and SAVE STATE rewinds have to be planned.',
    tips: 'Learn the ring: let go of special the moment it flashes white. Leave a save before you go deep, and dash in threes.' },
  kami: { play: 3, learn: 3,
    hard: 'Three FOLDS - each changes his weight, jumps and neutral special. You have to fold for the moment.',
    tips: 'CRANE to recover and keep away, FROG to crush, BLADE to finish. Refold during a lull, not in their face.' },
  vitrail: { play: 4, learn: 3,
    hard: 'A combo fighter: his four elements are weak alone. Each one that lands can be cancelled into a DIFFERENT element (his normals into any of them), so the damage is in chains - and you have to see the hit land and pick the right next element fast. Slow on foot, and FULGURITE leaves him helpless unless it was part of a chain.',
    tips: 'Open with a normal or CINDER STEP, then go where they fly: RIME BLOOM pops them up close, FULGURITE follows them up, UMBRA holds them in place. Each element only once per chain - all four is a PRISM BREAK, and it gives you your up special back. A hit on you breaks the chain.' },
  // the lab's test fighters
  devoted: { play: 4, learn: 5,
    hard: 'She snowballs: DEVOTION, praying at her tree, four sludge stages, eight demons with their own commands, swimming in her stains.',
    tips: 'Plant the tree somewhere safe. Pray as soon as the meter is full. Pick demons for the fight you are in.' },
  'what-once-was': { play: 3, learn: 3,
    hard: 'Its MODE is random when the SIGNAL fills - you have to play SEE, INCOMING and SMILE differently.',
    tips: 'Learn each mode\'s command grab. OUT OF BODY moves the fight to where the TV lands - plan the new body.' },
  'last-seen': { play: 3, learn: 4,
    hard: 'Two fighters in one: frail ROSEMARY until the SIGHTINGS fill, then SEEN - a heavy that loses its axe if it screams in the air.',
    tips: 'Play ROSEMARY safe and cling to fill the meter. As SEEN, scream only on the ground.' },
  fists: { play: 1, learn: 1,
    hard: 'Not much - a fast, honest brawler.',
    tips: 'Get close and stay close. The burning dropkick covers distance.' },
  'young-link': { play: 2, learn: 2,
    hard: 'The hookshot and bombs reward good spacing.',
    tips: 'Bomb, then hookshot them in. The rising spin is a good way out.' },
};

/** A fighter's rating (or an unrated one). */
export function howHard(id) { return HOW_HARD[id] || { play: 0, learn: 0, hard: 'NOT RATED YET.', tips: '' }; }
/** A fighter's rank from 1 (EASY) to 5 (EXPERT): the harder of PLAY and LEARN. */
export function hardRank(id) { const h = howHard(id); return Math.max(h.play, h.learn); }

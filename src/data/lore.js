// Character files for the TRINKETS > CHARACTER FILES screen: a dossier and the story of each fighter,
// plus lore for their special costumes. (The milestone costumes' lore lives with them in skins.js.)
export const FILES = {
  'soul-summoner': {
    no: '001', alias: 'THE BLUE-FLAME KNIGHT', cls: 'NECROMANCER KNIGHT', weapon: 'SOULFIRE, HELD IN HIS PALM',
    origin: 'THE SKY SANCTUM', moves: 'FIREBALL - SOUL HEX - SUMMON SOUL - SOULFIRE JET', limit: 'SOULFIRE BEAM',
    lore: 'Once a royal guard of the Sky Sanctum, he died holding its gates - and refused to stay dead. He clawed his way back in the armour he fell in, the gold crown still on his helm and a cold blue fire burning in his palm: the souls of every warrior who fell beside him. He fights to give them one last battle worth remembering. When he summons a soul, he is calling a friend by name.',
  },
  'mr-wake': {
    no: '002', alias: 'THE GENTLEMAN OF THE DEEP', cls: 'ABYSSAL WIZARD', weapon: 'STAFF OF THE VOID GEM',
    origin: 'THE BLACK WATER UNDER GRAVEMOON BRIDGE', moves: 'VOID ORB - DRIFTING SOUL - SHADOW POOL - GEM ROCKET', limit: 'THE UNDERTOW',
    lore: 'No one knows what Mr Wake really is. Under the hat and cloak there is only a living shadow that pours itself into a wizard\'s shape and wears a cracked white mask for a face. Fishermen say he rose from the water under Gravemoon Bridge the night a purple star fell into it. He is unfailingly polite, bows before every fight, and drags the unlucky down into a dark that has eyes.',
  },
  'hero-knight': {
    no: '003', alias: 'THE LAST OF THE ORDER', cls: 'KNIGHT ERRANT', weapon: 'LONGSWORD, THROWN AND ALWAYS CAUGHT',
    origin: 'A FALLEN KINGDOM\'S LAST KNIGHTLY ORDER', moves: 'GRAND SLAM - BLADE TOSS - CYCLONE SLASH - COUNTER', limit: 'THOUSAND CUTS',
    lore: 'The youngest knight of an order that no longer exists. When her kingdom fell, Lacy took the order\'s last sword and its oath - protect those who cannot protect themselves - and walked out into the world alone. She swings like a slugger, waits like a duelist, and has never once dropped the sword she throws. Her hair turned white the night the castle burned. She doesn\'t talk about it.',
  },
};

// lore for costumes that aren't milestones, by fighter id and costume name
export const SKIN_LORE = {
  'soul-summoner': {
    '1-BIT': 'A glitch in the record. An old cartridge kept a copy of him in black and white - and one day the copy woke up, still burning.',
  },
  'mr-wake': {
    ROSEBUD: 'One spring he slept too long in the castle garden. He woke wrapped in roses, his staff bloomed into a giant tulip, and he decided he rather liked it.',
  },
  'hero-knight': {
    'BATTLE-WORN': 'Every dent is a promise kept. The armour cracks a little more with every fall - and she gets back up every time.',
    SAMURAI: 'Far to the east she trained under a swordmaster who said only three words to students who lost. She learned to say them too: you are weak.',
    '1-BIT': 'An old training simulator recorded every duel she ever fought. One night the recording started fighting back.',
    AKATSUKI: '"Dawn." The name a village gave the wandering swordswoman in crimson who arrived at sunrise and left their bandits in crystal shards.',
  },
};

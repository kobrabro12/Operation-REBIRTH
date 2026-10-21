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
    SOULFIRE: 'The blue flame he was buried with. It has never once gone out - not in rain, not in the grave, not in his hand.',
    EMBER: 'A summer spent guarding the forges below the Sanctum. The cape came back scorched red and the flame never cooled down.',
    FROST: 'He walked the glacier roads for a winter, raising the frozen dead. The cold got into his armour and stayed.',
    PLAGUE: 'In the marsh towns they hung green lanterns to keep the dead away. He took one home with him.',
    SHADOW: 'What the soulfire looks like with the light turned off. Some say this is the one who answers when he summons.',
    ROYAL: 'The parade armour of the Sanctum guard, worn once a year when the gates are opened. Gold flame, blue cape, no smiling.',
    '1-BIT': 'A glitch in the record. An old cartridge kept a copy of him in black and white - and one day the copy woke up, still burning.',
    "JACK-O'-LANTERN": 'Every autumn the village carves faces into pumpkins to keep the dead away. One year a dead knight carved his own and joined the parade.',
  },
  'mr-wake': {
    CRIMSON: 'The robe he was given when he swore himself to the deep. It has never once been dry.',
    TIDE: 'Dyed in the shallows at low tide, where the water turns green-blue and the gem hums back.',
    GILDED: 'A gift from a sunken kingdom that wanted him on its side. He took the gold and kept his own counsel.',
    GHOST: 'Bleached pale by a hundred years at the bottom of the sea. Sailors swear they see this one on foggy nights.',
    VENOM: 'He drank from the wrong tide pool. The poison didn\'t take - but it changed the colour of everything he touched.',
    ROSEBUD: 'One spring he slept too long in the castle garden. He woke wrapped in roses, his staff bloomed into a giant tulip, and he decided he rather liked it.',
    NOBLE: 'Court robes for when the drowned lords call a council. He only goes for the free gold.',
    '1-BIT': 'The deep is older than colour. Down at the very bottom, where no light reaches, he is only black and white - and he speaks in a language of ones and zeros.',
    NEON: 'He followed a humming light into the Neon Arcade and stayed for a thousand credits. The gem never quite stopped glowing pink.',
  },
  'hero-knight': {
    KNIGHT: 'Standard-issue steel and a sword that was her mother\'s. Nothing fancy. It has never needed to be.',
    CRIMSON: 'The colours of the border guard, worn for the year she held the pass alone.',
    GILDED: 'Ceremonial gold for the tournament at the capital. She won it, and then wore it into a real fight anyway.',
    VERDANT: 'The ranger\'s green, for the year she spent hunting in the Elderwood. The forest still remembers her.',
    SHADOW: 'Night-patrol armour, blackened so it wouldn\'t catch the moon. She was very good at night patrol.',
    AZURE: 'The blue of the lake knights, who taught her to fight with the sun at her back.',
    'BATTLE-WORN': 'Every dent is a promise kept. The armour cracks a little more with every fall - and she gets back up every time.',
    SAMURAI: 'Far to the east she trained under a swordmaster who said only three words to students who lost. She learned to say them too: you are weak.',
    'SOLID GOLD': 'A statue was cast of her in the capital square. One night the statue climbed down to see what the fuss was about.',
    '1-BIT': 'An old training simulator recorded every duel she ever fought. One night the recording started fighting back.',
    AKATSUKI: '"Dawn." The name a village gave the wandering swordswoman in crimson who arrived at sunrise and left their bandits in crystal shards.',
    STARLIGHT: 'She stood night watch on the Sanctum walls so often that the stars started to stick to her armour.',
  },
};

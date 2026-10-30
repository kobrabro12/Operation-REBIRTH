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

// the full backstory of each milestone costume, shown in CHARACTER FILES (even before it's unlocked).
// The one-line `lore` in skins.js is what the unlock screen shows.
export const MILESTONE_LORE = {
  'soul-summoner': {
    GRAVEKEEPER: 'Before the crown, before the fire, he dug graves below the Sky Sanctum for a copper a day. One night, with rain in the open pits, the dead whispered his name - and he was the only one in the kingdom who whispered back.',
    WRAITHBINDER: 'He learned their names, and a name is a leash. Two wraiths came first: a drowned sailor and a soldier with no face. They never left his side again, and they never once disobeyed him.',
    LICH: 'Binding the dead costs the living a little of themselves every time. He paid until there was nothing left to pay with. His flesh fell away, and a crown of violet fire lit itself above his bare skull.',
    'THE HOLLOW KING': 'Every soul he ever raised came home at once. The dead of a thousand years knelt before him on a throne of grave dirt and blue flame. The Hollow King does not rule a kingdom. He rules everyone who has ever left one.',
  },
  'hero-knight': {
    SQUIRE: 'Lacy was twelve when the knights rode out and never came back. She put on the bronze armour they left behind, three sizes too big, picked up a borrowed sword, and swore their oath alone in an empty chapel.',
    'KNIGHT-CAPTAIN': 'No one was left to knight her, so the people she saved did it instead - on a muddy field, with her own sword, after she held a bridge for a whole night. The royal blue was a gift from the village weavers.',
    PALADIN: 'An old shrine in the mountains had waited a hundred years for someone to keep the oath long enough. When she knelt there, the light came down and stayed. Now it gathers wherever her sword falls.',
    SERAPH: 'The oath is fulfilled: every promise kept, every person protected. The order she carried alone rises with her on wings of light. She still swings like a slugger. Some things a seraph keeps.',
  },
  'mr-wake': {
    RIPTIDE: 'The first time he lost a fight, he walked back into the sea to sulk. The tide turned under him and pulled - and for the first time in a hundred years, something down there pulled harder than he did. He came out soaked and smiling.',
    DEEPWATER: 'He let the current take him deeper. Past the wrecks, past the light, down where the gem in his staff had to learn to glow on its own. Bubbles still stream from his cloak - the sea keeps trying to breathe through him.',
    "ANGLER'S PACT": 'At the bottom of the black trench, something with a lantern for a face offered him a deal. He took it. His staff became a lure, his skin a lantern, and nobody - not even Mr Wake - remembers what he gave in return.',
    TIDEFATHER: 'The abyss answered. It crowned him in coral and gave him the tides to wear like a cloak. When the Tidefather moves, the ocean moves with him, and every drowned thing beneath it remembers his name.',
  },
};

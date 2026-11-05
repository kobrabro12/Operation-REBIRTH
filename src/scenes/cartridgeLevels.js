// Star Patrol's three encounters: marching scouts, diving raiders, then an armoured commander.
export const STAR_WAVES = [
  {name:'SCOUT FLEET', formation:'ranks', color:0x95dd7c, background:0x101b2b, speed:.7, fireEvery:62, shotSpeed:2.4, pattern:'straight'},
  {name:'RAIDER WING', formation:'chevron', color:0xffc967, background:0x2b1927, speed:1, fireEvery:58, shotSpeed:2.7, pattern:'spread'},
  {name:'VOID COMMANDER', formation:'escort', color:0xc59aff, background:0x211334, speed:1.2, fireEvery:48, shotSpeed:3, pattern:'aimed'},
];

// Platform triples are [left, right, top]. All jumps fit the runner's normal jump arc.
// Patrol tuples are [centre, top, range, speed]; their feet stay on a platform.
export const CRYPT_ROOMS = [
  {name:'OLD GATE', theme:'gate', wall:0x25233d, stone:0x6c5663, trim:0xc79aff,
    platforms:[[64,222,286],[280,418,286],[471,576,286],[316,383,246]],
    gems:[[183,266],[349,226],[520,266]], patrols:[[350,286,42,.026]], exit:[560,286]},
  {name:'MOSS STEPS', theme:'moss', wall:0x172f2b, stone:0x4e7160, trim:0xa1d585,
    platforms:[[64,190,286],[238,352,264],[408,576,286],[292,350,216]],
    gems:[[150,266],[320,196],[498,266]], patrols:[[494,286,46,.03]], exit:[560,286]},
  {name:'SUNKEN VAULT', theme:'water', wall:0x172b46, stone:0x426e84, trim:0x7bd9ef,
    platforms:[[64,245,286],[305,434,286],[492,576,270],[170,235,234],[355,420,230]],
    gems:[[202,214],[385,210],[541,250]], patrols:[[367,286,42,.033]], exit:[560,270]},
  {name:'EMBER BRIDGE', theme:'ember', wall:0x381e2b, stone:0x8b5550, trim:0xffa05c,
    platforms:[[64,174,286],[226,320,266],[368,460,246],[508,576,266]],
    gems:[[267,246],[412,226],[547,246]], patrols:[[414,246,27,.035]], exit:[560,266]},
  {name:'FROZEN HALL', theme:'frost', wall:0x263449, stone:0x6b8b9a, trim:0xc2efff,
    platforms:[[64,576,286],[180,250,238],[304,374,198],[434,504,238]],
    gems:[[215,218],[339,178],[469,218]], patrols:[[354,286,142,.024],[469,238,20,.04]], exit:[560,286]},
  {name:'BROKEN BELFRY', theme:'bells', wall:0x302744, stone:0x73627d, trim:0xefd195,
    platforms:[[64,200,286],[250,366,286],[418,576,286],[176,244,224],[300,368,196],[438,506,224]],
    gems:[[210,204],[334,176],[472,204]], patrols:[[500,286,45,.037]], exit:[560,286]},
  {name:'CRYSTAL DEPTHS', theme:'crystal', wall:0x262448, stone:0x655991, trim:0xb99aff,
    platforms:[[64,180,286],[240,358,266],[416,576,286],[138,206,226],[278,348,206],[424,494,226]],
    gems:[[174,206],[313,186],[459,206]], patrols:[[299,266,40,.038],[538,286,24,.043]], exit:[560,286]},
  {name:'CROWN CRYPT', theme:'crown', wall:0x33283c, stone:0x856b68, trim:0xffdc80,
    platforms:[[64,188,286],[248,380,286],[440,576,286],[154,222,238],[268,336,190],[394,462,238]],
    gems:[[188,218],[302,170],[428,218]], patrols:[[314,286,42,.04],[508,286,40,.042]], exit:[560,286]},
];

// Moonbound: three connected regions, each with a settlement, two trials and a guardian.
export const MOON_REGIONS=[
 {name:'MOSSWOOD',floor:0x203d36,wall:0x355b44,accent:0xb8e795,boss:'THORN GUARDIAN'},
 {name:'GLASS CAVERNS',floor:0x282c50,wall:0x555587,accent:0x98ddf2,boss:'CRYSTAL WYRM'},
 {name:'STAR CITADEL',floor:0x392f4b,wall:0x745e75,accent:0xffda91,boss:'THE HOLLOW SUN'},
];
export const MOON_ROOMS=[
 {name:'LANTERN VILLAGE',kind:'camp',obstacles:[[145,100,60,30],[440,220,60,30]]},
 {name:'THE LOST COURIER',kind:'rescue',obstacles:[[260,103,70,26],[430,222,60,26]]},
 {name:'ROOT SEAL',kind:'key',obstacles:[[180,110,28,40],[390,216,28,38]]},
 {name:'THORN SANCTUM',kind:'boss',obstacles:[]},
 {name:'CRYSTAL CAMP',kind:'camp',obstacles:[[150,212,60,35],[440,107,60,35]]},
 {name:'ECHO PRISON',kind:'rescue',obstacles:[[250,100,28,40],[380,220,28,40]]},
 {name:'GLASS SEAL',kind:'key',obstacles:[[170,106,40,38],[425,212,40,38]]},
 {name:'WYRM CHAMBER',kind:'boss',obstacles:[]},
 {name:'FALLEN OBSERVATORY',kind:'camp',obstacles:[[145,103,60,30],[440,220,60,30]]},
 {name:'THE LAST ASTRONOMER',kind:'rescue',obstacles:[[200,102,34,40],[400,224,34,35]]},
 {name:'SOLAR SEAL',kind:'key',obstacles:[[280,100,60,27],[280,233,60,27]]},
 {name:'THE HOLLOW THRONE',kind:'boss',obstacles:[]},
];
export const SKY_SECTORS=[
 {name:'CLOUD FRONTIER',color:0x152b44,accent:0x85d9ec,duration:1050},
 {name:'STORM CONVOY',color:0x262842,accent:0xb5b3ea,duration:1200},
 {name:'TEMPEST ENGINE',color:0x192b46,accent:0x72cce7,duration:780,boss:true},
 {name:'EMBER BELT',color:0x3a2434,accent:0xffb06e,duration:1150},
 {name:'FOUNDRY RUN',color:0x342537,accent:0xffd07a,duration:1250},
 {name:'IRON LEVIATHAN',color:0x322331,accent:0xff916e,duration:840,boss:true},
 {name:'SILENT ORBIT',color:0x191e39,accent:0xbdb8f7,duration:1200},
 {name:'STARFALL ARRAY',color:0x24213e,accent:0xe6c4f9,duration:1350},
 {name:'ECLIPSE CARRIER',color:0x1d1732,accent:0xf6dc9a,duration:900,boss:true},
];
export const CAMPAIGN_SAVE='rebirth.campaign.';

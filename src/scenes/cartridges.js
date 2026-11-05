import {FONT} from '../config.js';
export const CARTRIDGES=[
 {id:'star-patrol',name:'STAR PATROL',genre:'SPACE SHOOTER',color:0x5ad0ff,description:'Beat three unique fleets and the Void Commander.\nMOVE: A/D or arrows   FIRE: J / SPACE / A'},
 {id:'crypt-runner',name:'CRYPT RUNNER',genre:'PLATFORM ADVENTURE',color:0xc79aff,description:'Explore eight different crypts. Find every gem, then the door.\nMOVE: A/D or arrows   JUMP: J / SPACE / A'},
 {id:'neon-rally',name:'NEON RALLY',genre:'ARCADE RACER',color:0xffaa51,description:'Survive a 45-second highway run. Dodge traffic.\nSTEER: A/D or arrows   BRAKE: J / SPACE / A'},
 {id:'moonbound',name:'MOONBOUND',genre:'EXPLORATION ADVENTURE',scene:'CampaignGame',color:0xa6e1a0,description:'12 connected areas, three guardians, rescues, seals and camp upgrades. Saves your progress.\nWASD / D-PAD MOVE   J / A SWORD / INTERACT'},
 {id:'skybreak',name:'SKYBREAK',genre:'SCROLLING SHOOTER CAMPAIGN',scene:'CampaignGame',color:0xffbf78,description:'Nine sectors, three flagships and a hangar workshop. Buy weapon and shield upgrades. Saves at each sector.\nWASD / D-PAD MOVE   J / A FIRE'},
];
/** Finds a cartridge definition, falling back to Star Patrol for an unknown ID. */
export const cartridgeById=id=>CARTRIDGES.find(c=>c.id===id)||CARTRIDGES[0];
/** Returns a pixel-drawn cartridge container at the supplied position and scale. */
export function cartridgeArt(scene,id,x,y,scale=1){const c=cartridgeById(id),g=scene.add.graphics();g.fillStyle(0x080711);g.fillRect(-42,-58,84,116);g.fillStyle(0x676272);g.fillRect(-38,-54,76,108);g.fillStyle(0x393442);g.fillRect(-33,-49,66,91);g.fillStyle(0x211c30);g.fillRect(-28,-43,56,68);g.fillStyle(c.color);g.fillRect(-26,-41,52,3);g.fillRect(-26,22,52,3);for(let i=0;i<5;i++){g.fillStyle(0x99909b);g.fillRect(-29+i*12,31,8,14);}g.fillStyle(c.color);
 if(c.id==='star-patrol'){g.fillRect(-3,-27,6,29);g.fillRect(-16,-10,32,8);g.fillRect(-10,-19,20,6);for(const [a,b]of[[-20,-30],[18,-23],[-17,8],[20,12]])g.fillRect(a,b,2,2);}
 if(c.id==='crypt-runner'){g.fillRect(-20,-28,40,5);g.fillRect(-20,-28,6,39);g.fillRect(14,-28,6,39);g.fillRect(-5,-15,10,17);g.fillStyle(0x171221);g.fillRect(-1,-9,2,3);}
 if(c.id==='neon-rally'){g.fillRect(-13,-25,26,38);g.fillStyle(0x211c30);g.fillRect(-9,-18,18,9);g.fillRect(-9,1,18,6);g.fillRect(-17,-17,4,10);g.fillRect(13,-17,4,10);}
 if(c.id==='moonbound'){g.fillRect(-3,-20,6,32);g.fillRect(-17,-16,34,6);g.fillRect(-12,-26,24,10);g.fillStyle(0x211c30);g.fillRect(-6,1,12,12);}
 if(c.id==='skybreak'){g.fillRect(-20,-4,40,8);g.fillRect(-7,-20,12,39);g.fillStyle(0x211c30);g.fillRect(-3,-8,9,14);g.fillStyle(0xffe9af);g.fillRect(-25,-3,7,6);}
 const label=scene.add.text(0,49,c.name,{fontFamily:FONT,fontSize:'4px',color:'#fff4da'}).setOrigin(.5);return scene.add.container(x,y,[g,label]).setScale(scale);}

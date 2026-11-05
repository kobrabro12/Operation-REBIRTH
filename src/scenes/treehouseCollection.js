import {SHOP} from '../data/shop.js';
import {owns} from '../progress.js';
import {FONT} from '../config.js';

/** Returns every owned shop soundtrack, including secret and gacha records, without granting music. */
export function ownedRecords(){return SHOP.flatMap(s=>s.items).filter(it=>it.kind==='music'&&owns(it.id));}

/** Draws a physical album sleeve and its visible vinyl disc as a single inspectable container. */
export function recordSleeve(scene,it,x,y,scale=1){
 const g=scene.add.graphics(),color=it.color||0xc79aff;
 g.fillStyle(0x090812);g.fillRect(-37,-40,74,80);g.fillStyle(color);g.fillRect(-33,-36,66,72);
 g.fillStyle(0x292333);g.fillRect(-29,-32,58,59);g.fillStyle(0x12121d);g.fillCircle(0,-2,24);g.lineStyle(1,0x555063);
 for(const r of [12,18,22])g.strokeCircle(0,-2,r);g.fillStyle(color);g.fillCircle(0,-2,9);g.fillStyle(0xf5e8d0);g.fillRect(-1,-3,2,2);
 g.lineStyle(1,color,.7);g.lineBetween(-20,-16,-9,-24);g.lineBetween(9,19,20,11);
 for(let i=0;i<6;i++){g.fillStyle(color);g.fillRect(-25+i*9,-30,4,2+(it.id.length+i)%4*2);}
 const label=scene.add.text(0,32,it.name,{fontFamily:FONT,fontSize:'3px',color:'#f5e8d0',wordWrap:{width:64},align:'center'}).setOrigin(.5);
 return scene.add.container(x,y,[g,label]).setScale(scale);
}

/** Renders one spine per owned record on the rack beside the turntable, plus the manga volume. */
export function drawCollectionShelf(scene,records){
 const g=scene.add.graphics().setDepth(1),box=(x,y,w,h,c)=>{g.fillStyle(c);g.fillRect(x,y,w,h);};
 box(356,149,88,105,0x100d1a);box(359,152,82,99,0x302333);
 for(const y of [192,240]){box(356,y,88,5,0xa77350);box(360,y,80,1,0xd2a069);}
 records.forEach((it,i)=>{const x=362+i%10*7,y=158+Math.floor(i/10)*48;box(x,y,6,34,0x151320);box(x+1,y+1,4,32,it.color);box(x+1,y+6,4,12,0x151320);box(x+2,y+10,2,3,it.color);box(x+2,y+25,2,3,0xf5e8d0);});
 // An original, visibly illustrated paperback lives on the bookcase's second shelf.
 box(73,115,44,39,0x100d1a);box(76,117,39,35,0xf2ead7);box(76,117,4,35,0x8e8a85);box(84,134,9,15,0x17151b);box(85,129,8,6,0x17151b);box(87,131,5,2,0xf2ead7);g.lineStyle(2,0x17151b);g.lineBetween(93,148,108,130);
 const title=scene.add.text(83,119,'IRON\nRAIN',{fontFamily:FONT,fontSize:'4px',color:'#17151b',lineSpacing:1}).setDepth(2);
 const count=scene.add.text(361,143,'VINYL / '+records.length,{fontFamily:FONT,fontSize:'5px',color:'#ffda96'}).setDepth(2);
 return [g,title,count];
}

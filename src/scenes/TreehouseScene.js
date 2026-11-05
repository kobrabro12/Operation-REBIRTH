import {FONT} from '../config.js';
import {MenuInput} from './menuInput.js';
import {makeButton} from '../ui/button.js';
import {addFullscreenButton} from '../ui/fullscreen.js';
import {stopMusic} from '../audio/music.js';
import {sfx} from '../audio/sfx.js';
const CORNERS=[
 {name:'BOOKSHELF',info:'Empty shelves, ready for a collection.',x:15,y:56,w:153,h:244},
 {name:'BEAN BAG',info:'The best seat in the treehouse.',x:164,y:211,w:193,h:111},
 {name:'CRT + CONSOLE',info:'All hooked up. No games or movies loaded.',x:444,y:152,w:185,h:169},
 {name:'RECORD PLAYER',info:'An empty platter, waiting for a record.',x:365,y:56,w:140,h:89},
 {name:'MOVIE POSTER',info:'Jason, a raised chainsaw, and a new terror at Crystal Lake.',x:231,y:43,w:121,h:161},
];
export class TreehouseScene extends Phaser.Scene{
 constructor(){super('Treehouse');}
 preload(){if(!this.textures.exists('physical_media_room'))this.load.image('physical_media_room','assets/rooms/physical-media-treehouse.png');}
 create(){this.selected=-1;this.menu=new MenuInput(this);stopMusic();this.add.image(320,180,'physical_media_room').setDisplaySize(640,360);this.trim=this.add.graphics().setDepth(5);this.trim.fillStyle(0x100d13,.8);this.trim.fillRect(0,0,640,34);this.trim.fillRect(0,324,640,36);
  this.add.text(320,12,'PHYSICAL MEDIA',{fontFamily:FONT,fontSize:'10px',color:'#ffe4ad',stroke:'#22130e',strokeThickness:2}).setOrigin(.5,0).setDepth(6);
  makeButton(this,8,5,'< SHOP',()=>this.back(),{size:'7px',pad:{x:12,y:8},bg:'#5e3828',depth:10});addFullscreenButton(this,632,5);
  this.caption=this.add.text(18,333,'THE TREEHOUSE',{fontFamily:FONT,fontSize:'7px',color:'#ffda96'}).setDepth(6);this.detail=this.add.text(18,347,'A quiet place for your collection.  /  ESC OR B TO LEAVE',{fontFamily:FONT,fontSize:'5px',color:'#e7d3b9',wordWrap:{width:606}}).setDepth(6);
  this.highlight=this.add.graphics().setDepth(2);this.corners=CORNERS;
  this.zones=CORNERS.map((c,i)=>this.add.zone(c.x,c.y,c.w,c.h).setOrigin(0).setInteractive({useHandCursor:true}).on('pointerover',()=>this.inspect(i)).on('pointerdown',()=>{this.inspect(i);sfx('menu',.25);}));
 }
 inspect(i){this.selected=i;const c=CORNERS[i];this.caption.setText(c.name);this.detail.setText(c.info);const g=this.highlight;g.clear();g.lineStyle(1,0xffd78d,.8);const x=c.x,y=c.y,w=c.w,h=c.h;for(const [px,py,sx,sy]of[[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]]){g.lineBetween(px,py,px+sx*8,py);g.lineBetween(px,py,px,py+sy*8);}}
 back(){this.scene.start('Shop');}
 update(){const m=this.menu.poll();if(m.back||m.pads.some(p=>p.button==='b'))return this.back();if(m.left||m.up||m.right||m.down){const d=m.left||m.up?-1:1;this.inspect(this.selected<0?(d>0?0:CORNERS.length-1):(this.selected+d+CORNERS.length)%CORNERS.length);}if(m.ok||m.pads.some(p=>p.button==='a'))this.inspect(this.selected<0?0:this.selected);}
}

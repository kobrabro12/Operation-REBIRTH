import {CARTRIDGES,cartridgeById,cartridgeArt} from './cartridges.js';
import {drawTreehouse} from './treehouseArt.js';
import {ARC,slant} from '../ui/arcade.js';
import {FONT} from '../config.js';
import {MenuInput} from './menuInput.js';
import {makeButton} from '../ui/button.js';
import {addFullscreenButton} from '../ui/fullscreen.js';
import {stopMusic} from '../audio/music.js';
import {sfx} from '../audio/sfx.js';
const CORNERS=[
 {name:'BOOKSHELF',info:'Three cartridges below. The book shelves are still empty.',x:15,y:56,w:153,h:244},
 {name:'BEAN BAG',info:'The best seat in the treehouse.',x:178,y:215,w:119,h:91},
 {name:'CRT + CONSOLE',info:'Pick up a cartridge, then insert it here to play.',x:444,y:152,w:185,h:169},
 {name:'RECORD PLAYER',info:'An empty platter, waiting for a record.',x:365,y:62,w:144,h:84},
 {name:'MOVIE POSTER',info:'Your Friday the 13th poster, overlooking the collection.',x:231,y:43,w:121,h:161},
];
/** Furnished physical-media room with inspectable cartridges and a playable CRT console. */
export class TreehouseScene extends Phaser.Scene{
 constructor(){super('Treehouse');}
 preload(){if(!this.textures.exists('treehouse_poster'))this.load.image('treehouse_poster','assets/rooms/jason-poster.png');}
 /** Draws the room and restores an ejected cartridge to the player’s hand. */
 create(data={}){this.cameras.main.setZoom(1).setScroll(0,0);this.held=data.cartridge||null;this.transitioning=false;this.modal=null;this.selected=-1;this.menu=new MenuInput(this);stopMusic();this.roomArt=drawTreehouse(this);this.trim=this.add.graphics().setDepth(5);slant(this.trim,-8,0,660,34,ARC.ink,.96,10);slant(this.trim,-8,324,660,36,ARC.deep,.96,10);
  this.add.text(320,12,'PHYSICAL MEDIA',{fontFamily:FONT,fontSize:'10px',color:'#ffe4ad',stroke:'#22130e',strokeThickness:2}).setOrigin(.5,0).setDepth(6);
  makeButton(this,8,5,'< SHOP',()=>this.back(),{size:'7px',pad:{x:12,y:8},bg:'#5e3828',depth:10});addFullscreenButton(this,632,5);
  this.caption=this.add.text(18,333,'THE TREEHOUSE',{fontFamily:FONT,fontSize:'7px',color:'#ffda96'}).setDepth(6);this.detail=this.add.text(18,347,'A quiet place for your collection.  /  ESC OR B TO LEAVE',{fontFamily:FONT,fontSize:'5px',color:'#e7d3b9',wordWrap:{width:606}}).setDepth(6);
  this.highlight=this.add.graphics().setDepth(2);this.corners=[...CORNERS,...CARTRIDGES.map((c,i)=>({name:c.name,info:c.genre+' / PICK UP AND INSPECT',x:40+i*40,y:258,w:33,h:42,cartridge:c.id}))];
  this.cartSprites=CARTRIDGES.map((c,i)=>cartridgeArt(this,c.id,56+i*40,278,.27));
  this.heldSprite=null;this.insertButton=makeButton(this,450,331,'INSERT CARTRIDGE',()=>this.insert(),{size:'6px',pad:{x:8,y:6},bg:'#5b467a',depth:10}).setVisible(!!this.held);this.refreshCartridges();
  this.zones=this.corners.map((c,i)=>this.add.zone(c.x,c.y,c.w,c.h).setOrigin(0).setInteractive({useHandCursor:true}).on('pointerover',()=>this.inspect(i)).on('pointerdown',()=>{this.activate(i);sfx('menu',.25);}));this.refreshCartridges();
 }
 inspect(i){this.selected=i;const c=this.corners[i];this.caption.setText(c.name);this.detail.setText(c.info);const g=this.highlight;g.clear();g.lineStyle(1,0xffd78d,.8);const x=c.x,y=c.y,w=c.w,h=c.h;for(const [px,py,sx,sy]of[[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]]){g.lineBetween(px,py,px+sx*8,py);g.lineBetween(px,py,px,py+sy*8);}}
 refreshCartridges(){this.cartSprites.forEach((s,i)=>{const visible=CARTRIDGES[i].id!==this.held;s.setVisible(visible);if(this.zones?.[5+i]?.input)this.zones[5+i].input.enabled=visible;});this.heldSprite?.destroy();this.heldSprite=this.held?cartridgeArt(this,this.held,405,295,.28).setDepth(8):null;this.insertButton?.setVisible(!!this.held);}
 activate(i){if(this.transitioning)return;this.inspect(i);const c=this.corners[i];if(c.cartridge)this.openCartridge(c.cartridge);else if(i===2&&this.held)this.insert();}
 /** Shows the cartridge label and controls before the player picks it up. */
 openCartridge(id){this.closeModal();const c=cartridgeById(id),parts=[];const add=o=>{parts.push(o);return o;};const g=add(this.add.graphics().setDepth(20));g.fillStyle(0x070610,.9);g.fillRect(0,34,640,290);g.fillStyle(ARC.panel);g.fillRect(134,55,372,253);g.lineStyle(2,c.color);g.strokeRect(134,55,372,253);const blocker=add(this.add.zone(0,34,640,290).setOrigin(0).setDepth(20).setInteractive());
 add(cartridgeArt(this,id,218,171,.95).setDepth(21));add(this.add.text(280,82,c.name,{fontFamily:FONT,fontSize:'9px',color:'#ffefc6',wordWrap:{width:208}}).setDepth(21));add(this.add.text(280,111,c.genre,{fontFamily:FONT,fontSize:'6px',color:'#b2cadb'}).setDepth(21));add(this.add.text(280,142,c.description,{fontFamily:FONT,fontSize:'6px',color:'#d5cfe8',lineSpacing:9,wordWrap:{width:198}}).setDepth(21));
 add(makeButton(this,280,256,'PICK UP',()=>this.pickUp(id),{size:'9px',pad:{x:18,y:10},depth:22,bg:'#386e67'}));add(makeButton(this,459,61,'X',()=>this.closeModal(),{size:'8px',depth:22}));this.modal={id,parts};}
 closeModal(){if(this.modal){for(const p of this.modal.parts){p.plate?.destroy();p.destroy();}this.modal=null;}}
 pickUp(id){this.closeModal();this.held=id;this.refreshCartridges();this.caption.setText(cartridgeById(id).name+' / IN HAND');this.detail.setText('SELECT THE CONSOLE OR PRESS INSERT TO PLAY.');sfx('select',.4);}
 insert(){if(!this.held||this.transitioning)return;this.closeModal();this.transitioning=true;const id=this.held;this.insertButton.setVisible(false);this.highlight.clear();if(this.heldSprite)this.tweens.add({targets:this.heldSprite,x:522,y:283,scaleX:.16,scaleY:.16,duration:300});this.time.delayedCall(320,()=>{this.cameras.main.pan(535,211,650,Phaser.Math.Easing.Cubic.InOut);this.cameras.main.zoomTo(6,650,Phaser.Math.Easing.Cubic.InOut);sfx('ding',.4);});this.time.delayedCall(1000,()=>this.scene.start('CartridgeGame',{id}));}
 back(){if(this.transitioning)return;if(this.modal)return this.closeModal();this.scene.start('Shop');}
 update(){if(this.transitioning)return;const m=this.menu.poll();if(m.back||m.pads.some(p=>p.button==='b'))return this.back();if(this.modal){if(m.ok||m.pads.some(p=>p.button==='a'))this.pickUp(this.modal.id);return;}if(m.left||m.up||m.right||m.down){const d=m.left||m.up?-1:1;this.inspect(this.selected<0?(d>0?0:this.corners.length-1):(this.selected+d+this.corners.length)%this.corners.length);}if(m.ok||m.pads.some(p=>p.button==='a'))this.activate(this.selected<0?0:this.selected);}
}

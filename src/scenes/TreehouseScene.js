import {CARTRIDGES,cartridgeById,cartridgeArt} from './cartridges.js';
import {drawTreehouse} from './treehouseArt.js';
import {ARC,slant} from '../ui/arcade.js';
import {FONT} from '../config.js';
import {MenuInput} from './menuInput.js';
import {makeButton} from '../ui/button.js';
import {addFullscreenButton} from '../ui/fullscreen.js';
import {playMusic,stopMusic} from '../audio/music.js';
import {ownedRecords,recordSleeve,drawCollectionShelf} from './treehouseCollection.js';
import {MANGA_PAGES,drawMangaPanel,drawMangaPage} from './robotSlayerManga.js';
import {sfx} from '../audio/sfx.js';
const CORNERS=[
 {name:'BOOKSHELF',info:'IRON RAIN: a six-page robot slayer manga. SELECT TO READ.',x:15,y:56,w:153,h:244},
 {name:'BEAN BAG',info:'The best seat in the treehouse.',x:178,y:215,w:119,h:91},
 {name:'CRT + CONSOLE',info:'Pick up a cartridge, then insert it here to play.',x:444,y:152,w:185,h:169},
 {name:'RECORD PLAYER',info:'Select an owned vinyl and play it here.',x:365,y:62,w:144,h:84},
 {name:'MOVIE POSTER',info:'Your Friday the 13th poster, overlooking the collection.',x:231,y:43,w:121,h:161},
];
/** Furnished physical-media room with inspectable cartridges and a playable CRT console. */
export class TreehouseScene extends Phaser.Scene{
 constructor(){super('Treehouse');}
 preload(){if(!this.textures.exists('treehouse_poster'))this.load.image('treehouse_poster','assets/rooms/jason-poster.png');}
 /** Draws the room and restores an ejected cartridge to the player’s hand. */
 create(data={}){this.cameras.main.setZoom(1).setScroll(0,0);this.held=data.cartridge||null;this.transitioning=false;this.modal=null;this.playingRecord=null;this.roomTick=0;this.collectionArt=[];this.selected=-1;this.menu=new MenuInput(this);stopMusic();this.roomArt=drawTreehouse(this);this.refreshCollection();this.turntable=this.add.graphics().setDepth(2);this.events.once('shutdown',()=>{if(this.playingRecord)stopMusic();this.playingRecord=null;});this.trim=this.add.graphics().setDepth(5);slant(this.trim,-8,0,660,34,ARC.ink,.96,10);slant(this.trim,-8,324,660,36,ARC.deep,.96,10);
  this.add.text(320,12,'PHYSICAL MEDIA',{fontFamily:FONT,fontSize:'10px',color:'#ffe4ad',stroke:'#22130e',strokeThickness:2}).setOrigin(.5,0).setDepth(6);
  makeButton(this,8,5,'< SHOP',()=>this.back(),{size:'7px',pad:{x:12,y:8},bg:'#5e3828',depth:10});addFullscreenButton(this,632,5);
  this.caption=this.add.text(18,333,'THE TREEHOUSE',{fontFamily:FONT,fontSize:'7px',color:'#ffda96'}).setDepth(6);this.detail=this.add.text(18,347,'A quiet place for your collection.  /  ESC OR B TO LEAVE',{fontFamily:FONT,fontSize:'5px',color:'#e7d3b9',wordWrap:{width:606}}).setDepth(6);
  this.highlight=this.add.graphics().setDepth(2);this.corners=[...CORNERS,...CARTRIDGES.map((c,i)=>({name:c.name,info:c.genre+' / PICK UP AND INSPECT',x:40+(i<3?i:i-3)*40,y:(i<3?278:224)-20,w:33,h:42,cartridge:c.id})),{name:'VINYL SHELF',vinyl:true,info:'YOUR OWNED SOUNDTRACKS / SELECT TO BROWSE',x:356,y:143,w:88,h:111}];
  this.cartSprites=CARTRIDGES.map((c,i)=>cartridgeArt(this,c.id,56+(i<3?i:i-3)*40,i<3?278:224,.27));
  this.heldSprite=null;this.insertButton=makeButton(this,450,331,'INSERT CARTRIDGE',()=>this.insert(),{size:'6px',pad:{x:8,y:6},bg:'#5b467a',depth:10}).setVisible(!!this.held);this.refreshCartridges();
  this.zones=this.corners.map((c,i)=>this.add.zone(c.x,c.y,c.w,c.h).setOrigin(0).setInteractive({useHandCursor:true}).on('pointerover',()=>this.inspect(i)).on('pointerdown',()=>{this.activate(i);sfx('menu',.25);}));this.refreshCartridges();
 }
 inspect(i){this.selected=i;const c=this.corners[i];this.caption.setText(c.name);this.detail.setText(c.info);const g=this.highlight;g.clear();g.lineStyle(1,0xffd78d,.8);const x=c.x,y=c.y,w=c.w,h=c.h;for(const [px,py,sx,sy]of[[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]]){g.lineBetween(px,py,px+sx*8,py);g.lineBetween(px,py,px,py+sy*8);}}
 refreshCartridges(){this.cartSprites.forEach((s,i)=>{const visible=CARTRIDGES[i].id!==this.held;s.setVisible(visible);if(this.zones?.[5+i]?.input)this.zones[5+i].input.enabled=visible;});this.heldSprite?.destroy();this.heldSprite=this.held?cartridgeArt(this,this.held,405,295,.28).setDepth(8):null;this.insertButton?.setVisible(!!this.held);}
 activate(i){if(this.transitioning)return;this.inspect(i);const c=this.corners[i];if(c.cartridge)this.openCartridge(c.cartridge);else if(i===2&&this.held)this.insert();else if(i===0)this.openManga();else if(i===3||c.vinyl)this.openRecords();}
 /** Shows the cartridge label and controls before the player picks it up. */
 openCartridge(id){this.closeModal();const c=cartridgeById(id),parts=[];const add=o=>{parts.push(o);return o;};const g=add(this.add.graphics().setDepth(20));g.fillStyle(0x070610,.9);g.fillRect(0,34,640,290);g.fillStyle(ARC.panel);g.fillRect(134,55,372,253);g.lineStyle(2,c.color);g.strokeRect(134,55,372,253);add(this.add.zone(0,34,640,290).setOrigin(0).setDepth(20).setInteractive());
 add(cartridgeArt(this,id,218,171,.95).setDepth(21));add(this.add.text(280,82,c.name,{fontFamily:FONT,fontSize:'9px',color:'#ffefc6',wordWrap:{width:208}}).setDepth(21));add(this.add.text(280,111,c.genre,{fontFamily:FONT,fontSize:'6px',color:'#b2cadb'}).setDepth(21));add(this.add.text(280,142,c.description,{fontFamily:FONT,fontSize:'6px',color:'#d5cfe8',lineSpacing:9,wordWrap:{width:198}}).setDepth(21));
 add(makeButton(this,280,256,'PICK UP',()=>this.pickUp(id),{size:'9px',pad:{x:18,y:10},depth:22,bg:'#386e67'}));add(makeButton(this,459,61,'X',()=>this.closeModal(),{size:'8px',depth:22}));this.modal={kind:'cartridge',id,parts};}
 closeModal(){if(this.modal){for(const p of this.modal.parts){p.plate?.destroy();p.destroy();}this.modal=null;}}
 pickUp(id){this.closeModal();this.held=id;this.refreshCartridges();this.caption.setText(cartridgeById(id).name+' / IN HAND');this.detail.setText('SELECT THE CONSOLE OR PRESS INSERT TO PLAY.');sfx('select',.4);}
 insert(){if(!this.held||this.transitioning)return;this.closeModal();this.transitioning=true;this.stopRecord();const id=this.held;this.insertButton.setVisible(false);this.highlight.clear();if(this.heldSprite)this.tweens.add({targets:this.heldSprite,x:522,y:283,scaleX:.16,scaleY:.16,duration:300});this.time.delayedCall(320,()=>{this.cameras.main.pan(535,211,650,Phaser.Math.Easing.Cubic.InOut);this.cameras.main.zoomTo(6,650,Phaser.Math.Easing.Cubic.InOut);sfx('ding',.4);});this.time.delayedCall(1000,()=>this.scene.start(cartridgeById(id).scene||'CartridgeGame',{id}));}
 back(){if(this.transitioning)return;if(this.modal)return this.closeModal();this.scene.start('Shop');}
 /** Refreshes the physical shelf from the shop's saved ownership; locked music never appears. */
 refreshCollection(){
  for(const part of this.collectionArt||[])part.destroy();
  this.records=ownedRecords();this.collectionArt=drawCollectionShelf(this,this.records);
 }
 /** Opens the album browser, keeping all owned records available across pages of four. */
 openRecords(index=0){
  this.closeModal();this.refreshCollection();
  const records=this.records,selected=Math.max(0,Math.min(index,records.length-1)),page=Math.floor(selected/4),parts=[];
  const add=o=>{parts.push(o);return o;},style={fontFamily:FONT,fontSize:'7px',color:'#f5e8d0',lineSpacing:5};
  const g=add(this.add.graphics().setDepth(20));g.fillStyle(0x0b0916,.98);g.fillRect(0,0,640,360);g.lineStyle(2,0xc28b59);g.strokeRect(27,36,586,306);
  add(this.add.zone(0,0,640,360).setOrigin(0).setDepth(20).setInteractive());
  add(this.add.text(44,48,'VINYL COLLECTION / '+records.length+' OWNED',{...style,fontSize:'10px'}).setDepth(21));
  add(this.add.text(44,76,records.length?'SELECT A SLEEVE. ENTER / A TO PLAY.':'BUY MUSIC IN THE SHOP TO FILL THIS SHELF.',style).setDepth(21));
  records.slice(page*4,page*4+4).forEach((it,i)=>{
   const x=108+i*142,idx=page*4+i;
   if(idx===selected){g.lineStyle(2,it.color);g.strokeRect(x-43,104,86,100);}
   add(recordSleeve(this,it,x,153,1).setDepth(21));
   add(this.add.text(x,207,it.name,{...style,fontSize:'6px',align:'center',wordWrap:{width:124}}).setOrigin(.5,0).setDepth(21));
   add(this.add.zone(x-58,102,116,132).setOrigin(0).setDepth(22).setInteractive({useHandCursor:true}).on('pointerdown',()=>this.openRecords(idx)));
  });
  if(!records.length)add(this.add.text(320,158,'NO RECORDS YET.\nYOUR PURCHASES WILL APPEAR HERE.',{...style,fontSize:'9px',align:'center',lineSpacing:14}).setOrigin(.5).setDepth(21));
  const now=this.playingRecord?records.find(r=>r.id===this.playingRecord)?.name:'SILENT';
  add(this.add.text(320,246,'ON THE TURNTABLE: '+now,{...style,fontSize:'6px',wordWrap:{width:536},align:'center'}).setOrigin(.5,0).setDepth(21));
  if(records.length){
   add(makeButton(this,221,274,this.playingRecord===records[selected].id?'STOP RECORD':'PLAY RECORD',()=>this.toggleRecord(records[selected].id),{size:'9px',depth:23,pad:{x:14,y:10},bg:'#386e67'}));
   if(page>0)add(makeButton(this,44,279,'< PREV',()=>this.openRecords((page-1)*4),{size:'8px',depth:23,pad:{x:14,y:10}}));
   if((page+1)*4<records.length)add(makeButton(this,513,279,'NEXT >',()=>this.openRecords((page+1)*4),{size:'8px',depth:23,pad:{x:14,y:10}}));
   add(this.add.text(320,320,'SHELF '+(page+1)+' / '+Math.ceil(records.length/4),{...style,fontSize:'6px'}).setOrigin(.5).setDepth(21));
  }
  add(makeButton(this,574,44,'X',()=>this.closeModal(),{size:'9px',depth:23,pad:{x:12,y:8}}));
  this.modal={kind:'vinyl',index:selected,parts};
 }
 /** Plays an owned soundtrack on the room's turntable without changing equipped battle music. */
 toggleRecord(id){
  const record=ownedRecords().find(r=>r.id===id);if(!record)return;
  if(this.playingRecord===id)this.stopRecord();else{playMusic(this,'bgm_shop_'+id.slice(4),.55);this.playingRecord=id;}
  const index=this.records.findIndex(r=>r.id===id);if(this.modal?.kind==='vinyl')this.openRecords(index);
 }
 /** Lifts the record off the turntable and silences only the room's playback. */
 stopRecord(){if(this.playingRecord)stopMusic();this.playingRecord=null;this.turntable?.clear();}
 /** Opens a traditional portrait manga page with an enlarged, readable panel alongside it. */
 openManga(page=0,focus=0){
  this.closeModal();page=Math.max(0,Math.min(MANGA_PAGES.length-1,page));focus=Math.max(0,Math.min(5,focus));const spread=MANGA_PAGES[page],parts=[];
  const add=o=>{parts.push(o);return o;},style={fontFamily:FONT,fontSize:'6px',color:'#f5efdf',lineSpacing:5};
  const g=add(this.add.graphics().setDepth(20));g.fillStyle(0x0b0916,.99);g.fillRect(0,0,640,360);g.lineStyle(1,0x8e8a85);g.strokeRect(26,36,588,272);
  add(this.add.zone(0,0,640,360).setOrigin(0).setDepth(20).setInteractive());
  add(this.add.text(37,48,'IRON RAIN / '+spread.title,{...style,fontSize:'8px'}).setDepth(21));
  add(this.add.text(237,75,'RIGHT TO LEFT / PANEL '+(focus+1)+' OF 6',style).setDepth(21));
  parts.push(...drawMangaPage(this,37,72,166,230,page,focus,i=>this.openManga(page,i)));
  parts.push(...drawMangaPanel(this,237,89,365,213,spread.panels[focus]));
  add(makeButton(this,37,313,page===5&&focus===5?'CLOSE':'< NEXT',()=>this.turnManga(1),{size:'8px',depth:23,pad:{x:14,y:10}}));
  add(makeButton(this,500,313,'PREV >',()=>this.turnManga(-1),{size:'8px',depth:23,pad:{x:14,y:10}}));
  add(makeButton(this,573,42,'X',()=>this.closeModal(),{size:'9px',depth:23,pad:{x:12,y:8}}));
  add(this.add.text(320,317,'PAGE '+(page+1)+' / 6',style).setOrigin(.5,0).setDepth(21));
  add(this.add.text(320,340,'LEFT / A NEXT   RIGHT PREV   B CLOSES',{...style,fontSize:'5px',color:'#b9a9c5'}).setOrigin(.5,0).setDepth(21));
  this.modal={kind:'manga',page,focus,parts};
 }
 /** Advances leftwards through each row of panels, then turns to the next portrait page. */
 turnManga(delta){const current=this.modal;if(current?.kind!=='manga')return;const next=current.page*6+current.focus+delta;if(next>=MANGA_PAGES.length*6)return this.closeModal();const clamped=Math.max(0,next);this.openManga(Math.floor(clamped/6),clamped%6);}
 /** Spins a small native vinyl on the existing platter while a purchased soundtrack plays. */
 drawRecord(){
  const g=this.turntable;g.clear();if(!this.playingRecord)return;
  const record=this.records.find(r=>r.id===this.playingRecord),angle=this.roomTick*.045;
  g.fillStyle(0x11111c);g.fillEllipse(422,112,37,8);g.lineStyle(1,0x555063);g.strokeEllipse(422,112,31,6);g.fillStyle(record?.color||0xc79aff);g.fillEllipse(422,112,10,4);
  g.lineStyle(1,0xd3cbd8);g.lineBetween(422+Math.cos(angle)*7,112+Math.sin(angle)*1.5,422+Math.cos(angle)*16,112+Math.sin(angle)*3);
 }
 /** Routes the shared menu controls to room hotspots, vinyl browsing, or manga page turns. */
 update(){
  if(this.transitioning)return;this.roomTick++;this.drawRecord();const m=this.menu.poll(),ok=m.ok||m.pads.some(p=>p.button==='a');
  if(m.back||m.pads.some(p=>p.button==='b'))return this.back();
  if(this.modal){
   const modal=this.modal;
   if(modal.kind==='manga'){
    if(m.left||m.down||ok)this.turnManga(1);else if(m.right||m.up)this.turnManga(-1);
   }else if(modal.kind==='vinyl'){
    if(this.records.length&&(m.left||m.up||m.right||m.down))this.openRecords((modal.index+(m.left||m.up?-1:1)+this.records.length)%this.records.length);
    else if(ok&&this.records[modal.index])this.toggleRecord(this.records[modal.index].id);
   }else if(ok)this.pickUp(modal.id);
   return;
  }
  if(m.left||m.up||m.right||m.down){const d=m.left||m.up?-1:1;this.inspect(this.selected<0?(d>0?0:this.corners.length-1):(this.selected+d+this.corners.length)%this.corners.length);}
  if(ok)this.activate(this.selected<0?0:this.selected);
 }
}

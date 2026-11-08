// A bright floating garden with a classic three-platform layout.
// The tree, apples and stars are scenery; the arena has no stage hazards.
const C={sky:0x8ce0ed,skyLight:0xe0f7ec,cloud:0xfff9ed,cloudShade:0xbde0ef,grass:0x73d366,grassLight:0xc4f28a,grassDark:0x3f9f65,
  soil:0xe0ab92,soilLight:0xffd8b0,soilDark:0xb77f82,wood:0xb98771,woodLight:0xf2c697,woodDark:0x825e65,leaf:0x64b775,leafLight:0x9bd984,leafDark:0x3b876a,star:0xffdf80,outline:0x566583};

/** Draw a stepped oval with the same sharp edges as the game's sprites. */
function blob(g,x,y,rx,ry,color,step=4){
  g.fillStyle(color,1);
  for(let yy=-ry;yy<ry;yy+=step){const half=Math.max(step,Math.round(Math.sqrt(Math.max(0,1-(yy/ry)**2))*rx/step)*step);g.fillRect(Math.round(x-half),Math.round(y+yy),half*2,step);}
}

/** A small five-point star used in the scenery and platform trim. */
function star(g,x,y,r,color,alpha=1){
  const p=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;p.push({x:Math.round(x+Math.cos(a)*rr),y:Math.round(y+Math.sin(a)*rr)});}
  g.fillStyle(color,alpha);g.fillPoints(p,true);
}

/** Puffy pixel clouds with optional little sleepy faces. */
function cloud(g,x,y,w,face=false){
  blob(g,x,y,w*.5,14,C.cloudShade);blob(g,x,y-3,w*.49,13,C.cloud);
  blob(g,x-w*.16,y-10,w*.23,15,C.cloud);blob(g,x+w*.13,y-8,w*.2,12,C.cloud);
  if(face){g.fillStyle(0x788eaa,.7);g.fillRect(x-6,y-4,2,4);g.fillRect(x+5,y-4,2,4);}
}

/** The friendly old tree is behind the fighters, with blinking eyes and stationary apples. */
function tree(g,x,y){
  g.fillStyle(C.woodDark);g.fillPoints([{x:x-33,y},{x:x-23,y:y-96},{x:x-6,y:y-147},{x:x+17,y:y-138},{x:x+24,y:y-52},{x:x+39,y}],true);
  g.fillStyle(C.wood);g.fillPoints([{x:x-27,y},{x:x-16,y:y-99},{x:x-4,y:y-140},{x:x+10,y:y-131},{x:x+16,y:y-35},{x:x+29,y}],true);
  g.fillStyle(C.woodLight);g.fillRect(x-17,y-108,7,77);g.fillRect(x-23,y-31,7,24);
  g.fillStyle(C.woodDark);for(let i=0;i<5;i++){g.fillRect(x-5+i*5,y-24-i*14,2,10);}
  for(const [dx,dy,rx,ry] of [[-49,-153,53,43],[43,-157,64,47],[-4,-187,71,48],[6,-132,75,37]]){
    blob(g,x+dx,y+dy,rx+4,ry+4,C.leafDark);blob(g,x+dx-2,y+dy-5,rx,ry,C.leaf);blob(g,x+dx-13,y+dy-17,rx*.55,ry*.46,C.leafLight);
  }
  for(const [dx,dy]of [[-59,-149],[47,-157],[7,-195]]){blob(g,x+dx,y+dy,6,7,0xcf6883,2);g.fillStyle(0xffc1a7);g.fillRect(x+dx-3,y+dy-4,2,3);g.fillStyle(C.woodDark);g.fillRect(x+dx,y+dy-10,2,4);}
}

/** A hazard-free Dreamland arena: one solid island and three jump-through shelves. */
export class DreamlandStage{
  constructor(scene){
    this.scene=scene;this.t=0;this.hazardsOn=false;this.music='bgm_dreamland';
    this.platforms=[{x1:-280,x2:280,y:0,bottom:44,solid:true},{x1:-196,x2:-74,y:-90,solid:false},{x1:74,x2:196,y:-90,solid:false},{x1:-62,x2:62,y:-160,solid:false}];
    this.spawns=[{x:-160,y:0},{x:160,y:0},{x:-55,y:0},{x:55,y:0}];
    this.clouds=[];
  }

  /** Build static pixel scenery once; only cloud positions and a few sparkles animate. */
  draw(world,bg){
    const s=this.scene,sky=s.add.graphics().setScrollFactor(0);
    const bands=[0x91d6f0,0xa0dff1,0xb1e9ed,0xc7f0e8,0xe2f5df,0xf8efd9];
    bands.forEach((color,i)=>{sky.fillStyle(color);sky.fillRect(-500,-300+i*125,1600,126);});
    // Pastel rainbow arcs are stepped into the far sky, behind the clouds and hills.
    for(let band=0;band<5;band++){const color=[0xf1b5c4,0xf8d1b4,0xf5e8ad,0xc5e2bb,0xb7d9ef][band];sky.lineStyle(5,color,.65);for(let i=0;i<35;i++){const a=Math.PI+i*Math.PI/35,b=Math.PI+(i+1)*Math.PI/35,r=132-band*5;sky.lineBetween(130+Math.cos(a)*r,230+Math.sin(a)*r,130+Math.cos(b)*r,230+Math.sin(b)*r);}}
    for(let i=0;i<8;i++){const x=-80+i*116,h=40+i%3*23;blob(sky,x,307,92,h, i%2?0x9fdbab:0xb4e5b4);sky.fillStyle(0xe8f5cf,.55);sky.fillRect(x-8,292-h,5,14);sky.fillRect(x+5,297-h,5,10);}
    bg.push(sky);
    for(let i=0;i<7;i++){const g=s.add.graphics().setScrollFactor(0);cloud(g,0,0,46+i%3*18,i%3===0);g.setPosition(-80+i*119,34+i%3*42);this.clouds.push({g,start:g.x,speed:.045+i%3*.017});bg.push(g);}
    const garden=s.add.graphics();tree(garden,143,-1);
    for(const [x,y]of [[-213,-12],[-104,-8],[230,-10]]){garden.fillStyle(C.grassDark);garden.fillRect(x,y,2,13);for(let i=0;i<5;i++){const a=i*1.256;blob(garden,x+Math.cos(a)*4,y-3+Math.sin(a)*4,3,3,0xf3abc1,2);}garden.fillStyle(C.star);garden.fillRect(x-1,y-4,3,3);}
    world.push(garden);
    this.face=s.add.graphics();world.push(this.face);
    const arena=s.add.graphics(),p=this.platforms[0],w=p.x2-p.x1;
    // The full-width checker rim matches the solid collider. The taper below is scenery.
    arena.fillStyle(C.soilDark);arena.fillRect(p.x1,0,w,44);
    for(let y=10;y<44;y+=12)for(let x=p.x1;x<p.x2;x+=12){arena.fillStyle(((x-p.x1)/12+(y-10)/12)%2?C.soil:C.soilLight);arena.fillRect(x,y,Math.min(12,p.x2-x),Math.min(12,44-y));}
    for(let row=0;row<12;row++){const inset=row*12+Math.floor(row*row*.7),width=w-inset*2;if(width<16)break;arena.fillStyle(row%2?C.soilDark:C.soil);arena.fillRect(p.x1+inset,44+row*6,width,6);}
    arena.fillStyle(C.grassDark);arena.fillRect(p.x1,-1,w,13);arena.fillStyle(C.grass);arena.fillRect(p.x1,0,w,8);arena.fillStyle(C.grassLight);arena.fillRect(p.x1,0,w,3);
    for(let x=p.x1+4;x<p.x2-3;x+=12){arena.fillStyle(C.grass);arena.fillRect(x,7,6,7);}
    for(let x=-230;x<=230;x+=92)star(arena,x,26,6,0xffedbd);
    for(const ledge of this.platforms.slice(1)){const x=ledge.x1,y=ledge.y,width=ledge.x2-x;arena.fillStyle(C.outline);arena.fillRect(x,y,width,3);arena.fillStyle(C.grassLight);arena.fillRect(x,y,width,2);arena.fillStyle(0xda9baf);arena.fillRect(x+2,y+3,width-4,8);arena.fillStyle(0xffd2ba);arena.fillRect(x+2,y+3,width-4,3);star(arena,(ledge.x1+ledge.x2)/2,y+12,5,C.star);}
    world.push(arena);
    this.sparkles=s.add.graphics().setScrollFactor(0);bg.push(this.sparkles);
    this.paintFace();
  }

  /** Blink without turning the background tree into a hazard or collision object. */
  paintFace(){
    const g=this.face;if(!g)return;g.clear();const blink=this.t%260>250,x=143;
    g.fillStyle(C.woodDark);g.fillRect(x-12,-68,5,blink?2:9);g.fillRect(x+6,-68,5,blink?2:9);
    blob(g,x,-42,6,8,C.woodDark,2);blob(g,x-2,-44,3,4,0x654e60,2);
    g.fillStyle(C.woodLight);g.fillRect(x-3,-62,4,12);
  }

  /** Advance decorative motion using simulation ticks; never return damaging hitboxes. */
  step(){
    this.t++;
    for(const c of this.clouds){c.g.x+=c.speed;if(c.g.x>730)c.g.x=-120;}
    if(this.t%5===0)this.paintFace();
    if(this.sparkles&&this.t%4===0){this.sparkles.clear();for(let i=0;i<6;i++)star(this.sparkles,45+i*109,38+i%3*34,2+i%2,C.cloud,.3+.45*(.5+.5*Math.sin(this.t*.035+i)));}
    return [];
  }
}

/** Stage-select miniature that mirrors the island and all three playable shelves. */
export function drawDreamlandPreview(g,x,y,w,h){
  g.fillStyle(C.sky);g.fillRect(x,y,w,h);g.fillStyle(C.skyLight);g.fillRect(x,y+h*.55,w,h*.45);
  blob(g,x+w*.77,y+h*.44,w*.17,h*.28,C.leafDark,2);blob(g,x+w*.74,y+h*.38,w*.2,h*.24,C.leafLight,2);
  g.fillStyle(C.wood);g.fillRect(x+w*.75,y+h*.46,w*.04,h*.3);g.fillStyle(C.woodDark);g.fillRect(x+w*.756,y+h*.56,2,3);g.fillRect(x+w*.777,y+h*.56,2,3);
  g.fillStyle(C.soil);g.fillRect(x+w*.08,y+h*.77,w*.84,h*.18);g.fillStyle(C.grass);g.fillRect(x+w*.08,y+h*.75,w*.84,Math.max(2,h*.06));
  for(const [cx,cy]of [[.29,.56],[.71,.56],[.5,.32]]){g.fillStyle(0xe9b5c4);g.fillRect(x+w*(cx-.09),y+h*cy,w*.18,Math.max(2,h*.045));g.fillStyle(C.grassLight);g.fillRect(x+w*(cx-.09),y+h*cy,w*.18,Math.max(1,h*.012));}
  star(g,x+w*.21,y+h*.19,Math.max(2,h*.065),C.star);
}

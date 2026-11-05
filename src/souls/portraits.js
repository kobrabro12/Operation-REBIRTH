// Native 96px soul art uses hard alpha edges and nearest-neighbor rendering at every UI size.
function makeAtlas(scene,sourceKey,key,cols,rows,trim=false){
 if(scene.textures.exists(key+'_baked'))return atlasFromBaked(scene,key,cols,rows);
 const image=scene.textures.get(sourceKey).getSourceImage(),size=96,atlas=scene.textures.createCanvas(key,size*cols,size*rows),ctx=atlas.context;ctx.imageSmoothingEnabled=false;
 let pixels=null;if(trim){const source=document.createElement('canvas');source.width=image.width;source.height=image.height;const c=source.getContext('2d');c.drawImage(image,0,0);pixels=c.getImageData(0,0,image.width,image.height).data;}
 for(let i=0;i<cols*rows;i++){const x=i%cols,y=Math.floor(i/cols),left=Math.floor(x*image.width/cols),top=Math.floor(y*image.height/rows),cw=Math.floor((x+1)*image.width/cols)-left,ch=Math.floor((y+1)*image.height/rows)-top;let sx=left,sy=top,sw=cw,sh=ch,dx=x*size,dy=y*size,dw=size,dh=size;if(trim){let minX=cw,minY=ch,maxX=0,maxY=0;for(let yy=0;yy<ch;yy++)for(let xx=0;xx<cw;xx++)if(pixels[((sy+yy)*image.width+sx+xx)*4+3]>=128){minX=Math.min(minX,xx);maxX=Math.max(maxX,xx);minY=Math.min(minY,yy);maxY=Math.max(maxY,yy);}if(minX>maxX||minY>maxY)continue;sx+=minX;sy+=minY;sw=maxX-minX+1;sh=maxY-minY+1;const fit=80/Math.max(sw,sh);dw=Math.round(sw*fit);dh=Math.round(sh*fit);dx+=Math.floor((size-dw)/2);dy+=Math.floor((size-dh)/2);}ctx.drawImage(image,sx,sy,sw,sh,dx,dy,dw,dh);}

 const data=ctx.getImageData(0,0,size*cols,size*rows);for(let n=3;n<data.data.length;n+=4)data.data[n]=data.data[n]>=128?255:0;ctx.putImageData(data,0,0);
 for(let i=0;i<cols*rows;i++)atlas.add(i,0,i%cols*size,Math.floor(i/cols)*size,size,size);atlas.refresh();atlas.setFilter(Phaser.Textures.FilterMode.NEAREST);scene.textures.remove(sourceKey);
 if(globalThis.__soulBake)globalThis.__soulBake[key]=atlas.canvas.toDataURL('image/png');   // npm run bake:souls collects these
}

/**
 * The same canvas texture makeAtlas would make, from its baked sheet (public/assets/souls/baked/<key>.png):
 * same size, same 96 px frames, nearest-neighbour. Exact, because the sheet's pixels are fully opaque or
 * fully see-through, which survive being saved as PNG unchanged.
 */
function atlasFromBaked(scene,key,cols,rows){
 const size=96,img=scene.textures.get(key+'_baked').getSourceImage(),atlas=scene.textures.createCanvas(key,size*cols,size*rows);
 atlas.context.imageSmoothingEnabled=false;atlas.context.drawImage(img,0,0);
 for(let i=0;i<cols*rows;i++)atlas.add(i,0,i%cols*size,Math.floor(i/cols)*size,size,size);
 atlas.refresh();atlas.setFilter(Phaser.Textures.FilterMode.NEAREST);scene.textures.remove(key+'_baked');
}
// One small shared canvas animates the lock's eye wherever the Aid portrait is shown.
function makeGrimoireEye(scene){
 const tex=scene.textures.get('soul_grimoire'),base=document.createElement('canvas');base.width=base.height=96;base.getContext('2d').drawImage(tex.getSourceImage(),0,0);const ctx=tex.context,game=scene.game;let last=-1;
 const pixels=ctx.getImageData(0,0,96,96).data;let x1=96,y1=96,x2=0,y2=0;
 for(let y=0;y<96;y++)for(let x=0;x<96;x++){const n=(y*96+x)*4,r=pixels[n],g=pixels[n+1],b=pixels[n+2];if(pixels[n+3]>128&&g>80&&g>r*1.25&&g>b*1.25){x1=Math.min(x1,x);x2=Math.max(x2,x);y1=Math.min(y1,y);y2=Math.max(y2,y);}}
 const found=x1<=x2,cx=found?Math.round((x1+x2)/2):47,cy=found?Math.round((y1+y2)/2):49,rx=found?Math.max(4,Math.min(7,Math.floor((x2-x1)/2))):6,ry=found?Math.max(4,Math.min(6,Math.floor((y2-y1)/2))):5;
 const look=[-3,2,-2,3,0,3,-3,1,-2,2,0,-3,3,0,2,-1,0,0],lift=[0,-1,1,-2,1,0,2,-1,0,-1,1,0,2,-2,0,1,0,0];
 const paint=phase=>{ctx.clearRect(0,0,96,96);ctx.drawImage(base,0,0);const blink=phase===17;
  for(let y=-ry;y<=ry;y++)for(let x=-rx;x<=rx;x++){const r=x*x/(rx*rx)+y*y/(ry*ry);if(r>.9)continue;ctx.fillStyle=blink?'#83192b':r>.65?'#4e861b':(Math.abs(x*3+y*5)%5===0?'#d8ff83':'#9be536');ctx.fillRect(cx+x,cy+y,1,1);}
  if(blink){ctx.fillStyle='#c08c2c';ctx.fillRect(cx-rx+1,cy,rx*2-1,1);}else{const dx=look[phase],dy=lift[phase];ctx.fillStyle='#131c08';ctx.fillRect(cx+dx-1,cy+dy-3,3,6);ctx.fillRect(cx+dx-(phase%3===0?2:0),cy+dy-1,phase%3===0?5:4,2);ctx.fillStyle='#ffffd9';ctx.fillRect(cx-2,cy-ry+1,2,2);}
  tex.refresh();
 };
 paint(3);
 const tick=time=>{const phase=Math.floor(time/180)%18;if(phase===last)return;if(!game.scene.getScenes(true).some(s=>s.sys.settings.key.startsWith('Soul')))return;last=phase;paint(phase);};
 game.events.on('step',tick);game.events.once('destroy',()=>game.events.off('step',tick));
}
// Preserve the supplied model image at full aspect ratio inside the square UI frame.
function makeShadowPortrait(scene){const image=scene.textures.get('soul_shadow_young_link_source').getSourceImage(),size=512,t=scene.textures.createCanvas('soul_shadow_young_link',size,size),fit=488/Math.max(image.width,image.height),w=Math.round(image.width*fit),h=Math.round(image.height*fit);t.context.drawImage(image,Math.floor((size-w)/2),Math.floor((size-h)/2),w,h);t.refresh();scene.textures.remove('soul_shadow_young_link_source');}
// Every soul picture that becomes a sheet of 96 px portraits: its file in public/assets/souls/, how many
// portraits across and down, and whether each portrait is cropped to the art (trim). The game loads the
// pre-made sheets from public/assets/souls/baked/ (tools/sprites/bake_soul_portraits.mjs makes them from
// these pictures with makeAtlas below - run `npm run bake:souls` after changing a soul picture or this
// list). The full pictures are 1254-2172 px; the sheets are a few hundred KB together.
export const SOUL_ATLASES = [
  { key: 'soul_frost_fire', file: 'frost-fire.png', cols: 2, rows: 2, trim: true },
  { key: 'soul_shadow_carnage', file: 'shadow-carnage.png', cols: 2, rows: 2, trim: true },
  { key: 'soul_ink_demon', file: 'ink-demon.png', cols: 1, rows: 1, trim: true },
  { key: 'soul_bendy', file: 'bendy.png', cols: 1, rows: 1, trim: true },
  { key: 'soul_grimoire', file: 'mythic-grimoire.png', cols: 1, rows: 1, trim: true },
  { key: 'soul_redesign', file: 'ronin-finch-redesign.png', cols: 3, rows: 1, trim: true },
  { key: 'soul_neo_japan', file: 'neo-japan.png', cols: 2, rows: 2, trim: true },
  { key: 'soul_medieval', file: 'medieval.png', cols: 2, rows: 2, trim: true },
  { key: 'soul_arcade_sky', file: 'arcade-sky.png', cols: 2, rows: 2, trim: true },
  { key: 'soul_misc', file: 'misc-souls.png', cols: 3, rows: 2, trim: true },
  { key: 'soul_steampunk', file: 'steampunk.png', cols: 2, rows: 2, trim: true },
  { key: 'soul_originals', file: 'originals.png', cols: 3, rows: 1, trim: false },
  { key: 'soul_evolution_art', file: 'evolutions.png', cols: 2, rows: 2, trim: true },
  { key: 'soul_new_aids', file: 'keepers.png', cols: 3, rows: 1, trim: false },
];

/** Builds every soul portrait texture at boot (from the baked sheets, or from the pictures when baking). */
export function makeOriginalSoulPortraits(scene){makeShadowPortrait(scene);for(const a of SOUL_ATLASES){makeAtlas(scene,a.key+'_source',a.key,a.cols,a.rows,a.trim);if(a.key==='soul_grimoire')makeGrimoireEye(scene);}}

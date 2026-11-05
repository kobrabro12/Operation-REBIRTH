import {PHONE_DEVICE} from './performance.js';
import {MOBILE_ATLASES} from './mobileAtlasManifest.js';
/**
 * Should the packed atlases be used? Yes on every device: the same frames, trimmed and packed, take about
 * a third of the memory (65 sheets: ~2.6 GB of full grids -> ~0.75 GB). `?atlases=0` in the URL loads
 * the full grids instead, to compare.
 */
export function useAtlases(env=globalThis){
 try{if(/[?&]atlases=0\b/.test(env.location.search))return false;}catch(e){/* no location */}
 return true;
}
/** Makes BootScene load the packed atlas (assets/mobile/) for every sheet that has one, instead of its full grid. */
export function installMobileTextures(scene){
 if(!useAtlases())return;
 const original=scene.load.spritesheet.bind(scene.load);
 scene.load.spritesheet=(key,url,config,...rest)=>{const spec=MOBILE_ATLASES[key];return spec?scene.load.atlas(key,spec.image,spec.json):original(key,url,config,...rest);};
 if(PHONE_DEVICE)scene.load.maxParallelDownloads=4;   // phones: fewer downloads at once
 scene.load.on('complete',()=>{for(const [key,spec]of Object.entries(MOBILE_ATLASES))if(scene.textures.exists(key))scene.textures.get(key).customData.mobileAtlas=spec.original;});
}
export function copyPackedFrames(manager,key,canvas,source){
 const frames={};
 for(const [name,f]of Object.entries(source.frames)){
  if(name==='__BASE')continue;
  const s=f.data.spriteSourceSize;
  frames[name]={frame:{x:f.cutX,y:f.cutY,w:f.cutWidth,h:f.cutHeight},trimmed:true,rotated:false,sourceSize:{w:f.realWidth,h:f.realHeight},spriteSourceSize:{x:s.x,y:s.y,w:s.w,h:s.h}};
 }
 const tex=manager.addAtlasJSONHash(key,canvas,{frames});tex.customData.mobileAtlas=source.customData.mobileAtlas;return tex;
}
// Special outline / pixel-patch costumes need their original grid during their one-time recolor.
export function expandPackedTexture(source){
 const spec=source.customData.mobileAtlas,cv=document.createElement('canvas');cv.width=spec.width;cv.height=spec.height;
 const ctx=cv.getContext('2d'),image=source.getSourceImage();
 for(const [name,f]of Object.entries(source.frames)){
  if(!/^\d+$/.test(name))continue;
  const i=Number(name),s=f.data.spriteSourceSize;
  ctx.drawImage(image,f.cutX,f.cutY,f.cutWidth,f.cutHeight,i%spec.columns*spec.frameWidth+s.x,Math.floor(i/spec.columns)*spec.frameHeight+s.y,f.cutWidth,f.cutHeight);
 }
 return cv;
}

// Capture the authoritative Boot loader registrations without starting a browser.
// The game imports a few images the Vite way ('x.png?inline'); plain Node can't, so they load as empty strings here.
import { register } from 'node:module';
register('data:text/javascript,' + encodeURIComponent(`
export async function load(url, context, next) {
  if (/\\.(png|jpe?g|gif|webp|svg|ogg|mp3|css)(\\?.*)?$/.test(url)) return { format: 'module', source: 'export default ""', shortCircuit: true };
  return next(url, context);
}
export async function resolve(spec, context, next) {
  if (spec.startsWith('virtual:')) return { url: 'data:text/javascript,export default {}', shortCircuit: true };
  return next(spec, context);
}`));
globalThis.Phaser={Scene:class{}};globalThis.location={search:'?atlases=0&lazySheets=0',hostname:'localhost'};   // list every sheet, as its full grid (no packed atlases, nothing put off to match time)
globalThis.document={getElementById:()=>null,addEventListener:()=>{},removeEventListener:()=>{},createElement:()=>({getContext:()=>null,style:{}})};
const {BootScene}=await import('../../src/scenes/BootScene.js');
const boot=new BootScene(),specs=[];boot.events={once:()=>{}};
boot.load={on:()=>{},spritesheet:(key,path,config)=>specs.push({key,path,config}),audio:()=>{},image:()=>{}};
boot.preload();process.stdout.write(JSON.stringify(specs));

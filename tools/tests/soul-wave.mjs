import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { readFileSync,mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();const url=server.resolvedUrls.local[0];
const browser=await chromium.launch({executablePath:process.env.SIM_CHROME||'/usr/bin/chromium',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--mute-audio','--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*',r=>{const u=r.request().url();if(u.includes('/npm/phaser@'))return r.fulfill({body:readFileSync('node_modules/phaser/dist/phaser.min.js'),contentType:'application/javascript'});return u.startsWith(url)?r.continue():r.abort();});
 await page.goto(url);await page.waitForFunction(()=>window.game?.scene?.isActive('Title'),null,{timeout:120000});








 const checks=await page.evaluate(async()=>{
  const game=window.game;
  for(const [key,cols,rows] of [['soul_medieval',2,2],['soul_arcade_sky',2,2],['soul_misc',3,2]]){const atlas=game.textures.get(key),canvas=atlas.getSourceImage(),data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;for(let i=0;i<cols*rows;i++){if(atlas.get(i).realWidth!==96)throw Error('Non-pixel portrait');let count=0;for(let y=0;y<96;y++)for(let x=0;x<96;x++){const a=data[((Math.floor(i/cols)*96+y)*canvas.width+i%cols*96+x)*4+3];if(a!==0&&a!==255)throw Error('Soft alpha');if(a){count++;if(x<7||y<7||x>88||y>88)throw Error('Sprite overflows cell '+key+' '+i);}}if(count<550||count>6500)throw Error('Empty or opaque background '+key+' '+i+' '+count);}}
  const {MatchScene}=await import('/src/scenes/MatchScene.js'),{settings}=await import('/src/settings.js');MatchScene.prototype.update=function(){};
  const created=(key,action)=>new Promise((resolve,reject)=>{const s=game.scene.getScene(key),timer=setTimeout(()=>reject(Error('Create timeout '+key)),10000);s.events.once('create',()=>{clearTimeout(timer);resolve(s);});action();});
  const stop=()=>game.scene.getScenes(true).forEach(s=>game.scene.stop(s.scene.key));
  const setup={...settings,mode:'stock',stocks:2,cpuCount:1,picks:['soul-summoner','hero-knight'],skins:[0,0],p1Pad:null,extraPads:[],hazards:false,items:false,stage:'sky-sanctum',track:'sky-sanctum'};
  const music=[];
  for(const id of ['bill-cipher','shadow-young-link']){stop();const m=await created('Match',()=>game.scene.start('Match',{soulBattle:{soulId:id,setup}}));const playing=m.sound.sounds.filter(s=>!s.pendingRemove&&(s.isPlaying||s.pendingPlay));if(!playing.some(s=>s.key==='soul_music_'+id&&s.loop))throw Error('Soul track not selected '+id+' '+playing.map(s=>s.key));if(playing.some(s=>s.key==='bgm_sky'))throw Error('Stage music mixed with soul track');music.push(playing.map(s=>s.key));}
  stop();Object.assign(settings,setup);const m=await created('Match',()=>game.scene.start('Match'));if(m.sound.sounds.some(s=>!s.pendingRemove&&(s.isPlaying||s.pendingPlay)&&s.key.startsWith('soul_music_')))throw Error('Soul music leaked into normal match');
  const {awardSoul}=await import('/src/souls/collection.js'),{setMainSoul,setAidSoul}=await import('/src/souls/team.js');['pixel-slime','sugar-sprite','neon-koi','abyss-oracle'].forEach(awardSoul);setMainSoul('abyss-oracle');setAidSoul(0,'pixel-slime');setAidSoul(1,'sugar-sprite');setAidSoul(2,'neon-koi');stop();const fight=await created('Match',()=>game.scene.start('Match'));const f=fight.fighters[0],t=fight.fighters[1];
  f.shieldHp=50;f.shieldStun=0;f.buffer={};f.st_shield({held:()=>true,tappedSide:()=>false,tappedDown:()=>false});if(Math.abs(f.shieldHp-49.888)>1e-6)throw Error('Slime shield drain inactive');
  f.percent=119;fight.applyHit(f,{owner:t,h:{dmg:2},facing:1,id:'sugar'},t.x);if(!f.sugarAidUsed||f.percent>=120)throw Error('Sugar healing inactive');f.respawn();if(f.sugarAidUsed)throw Error('Sugar charge not reset');
  f.percent=0;fight.applyHit(f,{owner:t,h:{dmg:100},facing:1,id:'koi',projectile:{}},t.x);const ranged=f.percent;f.percent=0;fight.applyHit(f,{owner:t,h:{dmg:100},facing:1,id:'plain'},t.x);if(ranged>=f.percent)throw Error('Koi defense inactive');return {pixelAtlases:14,music,ranged,melee:f.percent};
 });
 for(const id of ['oathbound-rowan','rune-archivist','storm-harrier']){
  await page.evaluate(async id=>{const {awardSoul}=await import('/src/souls/collection.js'),{addSoulXP}=await import('/src/souls/progression.js');awardSoul(id);addSoulXP(id,1900);for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);window.game.scene.start('SoulEvolution',{id});},id);
  await page.waitForFunction(()=>window.game.scene.isActive('SoulEvolution'));await page.waitForTimeout(250);await page.screenshot({path:'recordings/test-output/'+id+'-evolution.png'});await page.evaluate(()=>window.game.scene.getScene('SoulEvolution').confirm());await page.waitForFunction(()=>window.game.scene.getScene('SoulEvolution').done);
 }
 assert.deepEqual(errors,[]);console.log('PASS new pixel portraits, battle music priority/reset, real Aid shield/heal/projectile effects and all four evolution screens',checks);
}finally{await browser.close();await server.close();}

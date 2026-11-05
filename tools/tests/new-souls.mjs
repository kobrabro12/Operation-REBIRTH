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







 const art=await page.evaluate(async()=>{
  const atlas=window.game.textures.get('soul_originals');for(let i=0;i<3;i++){const f=atlas.get(i);if(f.realWidth!==96||f.realHeight!==96)throw Error('Portrait must be native 96px pixel art');}
  const p=atlas.getSourceImage().getContext('2d').getImageData(0,0,288,96).data;let opaque=0;for(let i=3;i<p.length;i+=4){if(p[i]!==0&&p[i]!==255)throw Error('Portrait pixels must have crisp alpha edges');if(p[i])opaque++;}if(opaque<5000)throw Error('Portrait art is empty');
  const {awardSoul}=await import('/src/souls/collection.js'),{setMainSoul,setAidSoul}=await import('/src/souls/team.js');['ember-ronin','moon-moth','gearling'].forEach(awardSoul);setMainSoul('ember-ronin');setAidSoul(0,'moon-moth');setAidSoul(1,'gearling');for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);window.game.scene.start('SoulTeam');return {nativeFrames:3,opaque};
 });await page.waitForTimeout(350);await page.screenshot({path:'recordings/test-output/new-souls-team.png'});
 const effects=await page.evaluate(async()=>{
  const {settings}=await import('/src/settings.js'),{MatchScene}=await import('/src/scenes/MatchScene.js');MatchScene.prototype.update=function(){};for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);Object.assign(settings,{mode:'stock',stocks:2,cpuCount:1,extraPads:[],p1Pad:null,picks:['hero-knight','soul-summoner'],skins:[0,0],stage:'neon-arcade',items:false,hazards:false});window.game.scene.start('Match');await new Promise(r=>setTimeout(r,400));while(!window.game.scene.isActive('Match')||!window.game.scene.getScene('Match').fighters?.length)await new Promise(r=>setTimeout(r,30));
  const m=window.game.scene.getScene('Match'),f=m.fighters[0],t=m.fighters[1];m.countdown=0;m.intros=null;const hit=(move,projectile)=>{t.percent=0;f.startAttack(move);m.applyHit(t,{owner:f,h:{dmg:20,damageType:'sword'},facing:1,id:'new-'+move,...(projectile?{projectile:{}}:{})},f.x);return t.percent;};const air=hit('fair'),ground=hit('jab'),projectile=hit('fair',true);if(air!==28||ground!==26||projectile!==26)throw Error('Aerial/Main bonuses incorrect '+JSON.stringify({air,ground,projectile}));
  f.shieldHp=60;m.shieldHit(f,{owner:t,h:{dmg:10}});const ward=60-f.shieldHp;if(Math.abs(ward-11.05)>.001)throw Error('Gearling shield reduction inactive '+ward);f.soulTeam.aids=[];f.shieldHp=60;m.shieldHit(f,{owner:t,h:{dmg:10}});if(Math.abs((60-f.shieldHp)-13)>.001)throw Error('Normal shielding changed');return {air,ground,projectile,shieldDamage:ward};
 });await page.evaluate(()=>{for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);window.game.scene.start('SoulBoard');});await page.waitForTimeout(300);await page.screenshot({path:'recordings/test-output/eight-soul-board.png'});
 assert.deepEqual(errors,[]);console.log('PASS new pixel soul art and real combat effects',art,effects);
}finally{await browser.close();await server.close();}

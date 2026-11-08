import {createServer} from 'vite';
import {chromium} from 'playwright-core';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();const url=server.resolvedUrls.local[0];
const browser=await chromium.launch({executablePath:process.env.SIM_CHROME||'/usr/bin/chromium',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--mute-audio','--no-sandbox']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>{errors.push(String(e));console.error(String(e));});
 await page.route('**/*',r=>{const u=r.request().url();if(u.includes('/npm/phaser@'))return r.fulfill({body:readFileSync('node_modules/phaser/dist/phaser.min.js'),contentType:'application/javascript'});return u.startsWith(url)?r.continue():r.abort();});
 await page.goto(url);await page.waitForFunction(()=>window.game?.scene?.isActive('Title'),null,{timeout:120000});
 const costumes=await page.evaluate(async()=>{const {skinsFor}=await import('/src/fighters/skins.js'),P=await import('/src/progress.js'),{MatchScene}=await import('/src/scenes/MatchScene.js');MatchScene.prototype.update=function(){};return skinsFor('soul-summoner').flatMap((s,i)=>{if(!s.sheetSet)return [];if(s.shop)P.grantItem(s.shop);return [{name:s.name,set:s.sheetSet,skin:i}];});});
 assert.equal(costumes.length,8);
 for(const c of costumes){
  await page.evaluate(async c=>{const {settings}=await import('/src/settings.js');for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);Object.assign(settings,{mode:'stock',stocks:3,cpuCount:1,p1Pad:null,extraPads:[],picks:['soul-summoner','mr-wake'],skins:[c.skin,0],stage:'sky-sanctum',training:true});window.game.scene.start('Match',{skipIntro:true});},c);
  await page.waitForFunction(c=>window.game?.scene?.isActive('Match')&&window.game.scene.getScene('Match').fighters?.[0]?.skin===c.skin,c,{timeout:90000});
  const result=await page.evaluate(c=>{
   const m=window.game.scene.getScene('Match'),f=m.fighters[0],key='ss_'+c.set+'_taunt';m.countdown=0;f.state='taunt';f.hurtAnim=0;
   if(!m.textures.exists(key)||m.textures.get(key).frameTotal-1!==40)throw Error('missing taunt '+key);
   const used=new Set();for(const dir of [-1,1])for(let t=0;t<80;t+=2){f.facing=dir;f.t=t;m.frame++;m.draw();used.add(f.sprite.frame.name);if(!f.sprite.texture.key.startsWith('ss_'+c.set+'_'))throw Error('costume lost');if(f.sprite.originY!==95/104&&c.set!=='orrery')throw Error('foot pivot jumped');}
   return used.size;
  },c);assert.ok(result>=30,c.name);
 }
 assert.deepEqual(errors,[]);console.log('PASS all eight drawn Soul Summoner costumes keep their geometry through full taunts and both facings');
}finally{await browser.close();await server.close();}

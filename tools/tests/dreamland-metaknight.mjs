import {createServer} from 'vite';
import {chromium} from 'playwright-core';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';

const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();const url=server.resolvedUrls.local[0];
const browser=await chromium.launch({executablePath:process.env.SIM_CHROME||'/usr/bin/chromium',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--mute-audio','--no-sandbox']});
mkdirSync('/tmp/rebirth-dreamland',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:960,height:540},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*',r=>{const u=r.request().url();if(u.includes('/npm/phaser@'))return r.fulfill({body:readFileSync('node_modules/phaser/dist/phaser.min.js'),contentType:'application/javascript'});return u.startsWith(url)?r.continue():r.abort();});
 await page.goto(url);await page.waitForFunction(()=>window.game?.scene?.isActive('Title'),null,{timeout:120000});
 const setup=await page.evaluate(async()=>{
  const {settings}=await import('/src/settings.js'),{STAGES,STAGE_SLOTS,stageLocked,trackList}=await import('/src/stage/stages.js'),music=await import('/src/audio/music.js');
  const {skinsFor,skinUnlocked}=await import('/src/fighters/skins.js'),P=await import('/src/progress.js'),{SHOP}=await import('/src/data/shop.js');
  const stage=STAGES.find(s=>s.id==='dreamland'),skin=skinsFor('hero-knight').findIndex(s=>s.name==='META KNIGHT'),item=SHOP[0].items.find(i=>i.id==='cos-metaknight');
  if(!stage||stageLocked(stage)||STAGES.length>=STAGE_SLOTS||!(music.TRACKS?.includes(stage.music.slice(4))??window.game.cache.audio.exists(stage.music))||!trackList([]).some(t=>t.music===stage.music))throw Error('stage/track inaccessible');
  if(skin<1||skinUnlocked('hero-knight',skin)||item.price!==1500)throw Error('costume lock');
  P.addCoins(1500);if(!P.buyItem(item.id,item.price)||!skinUnlocked('hero-knight',skin))throw Error('costume purchase');
  const {MatchScene}=await import('/src/scenes/MatchScene.js');MatchScene.prototype.update=function(){};
  window.game.scene.stop('Title');settings.stage='dreamland';window.game.scene.start('StageSelect');return {skin};
 });
 await page.waitForFunction(()=>window.game.scene.isActive('StageSelect')&&window.game.scene.getScene('StageSelect').name?.text==='DREAMLAND');
 const menu=await page.evaluate(()=>{const s=window.game.scene.getScene('StageSelect'),last=s.tiles.at(-1),dream=s.tiles.find(t=>t.st.id==='dreamland');if(last.y+29>331||!dream||s.name.text!=='DREAMLAND')throw Error('stage grid overflow');return {tiles:s.tiles.length,lastY:last.y};});
 await page.screenshot({path:'/tmp/rebirth-dreamland/select.png'});
 await page.evaluate(async skin=>{const {settings}=await import('/src/settings.js');window.game.scene.stop('StageSelect');Object.assign(settings,{mode:'stock',stocks:3,cpuCount:1,p1Pad:null,extraPads:[],picks:['hero-knight','soul-summoner'],skins:[skin,0],stage:'dreamland',training:true,items:false,hazards:true,track:'auto'});window.game.scene.start('Match',{skipIntro:true});},setup.skin);
 await page.waitForFunction(()=>window.game.scene.isActive('Match')&&window.game.scene.getScene('Match').fighters?.[0]?.sheets.idle==='hk_meta_idle',null,{timeout:90000});
 const report=await page.evaluate(()=>{
  const m=window.game.scene.getScene('Match'),f=m.fighters[0],s=m.stage;m.countdown=0;m.intros=null;m.bigText.setText('');
  if(s.constructor.name!=='DreamlandStage'||s.platforms.length!==4||s.spawns.length!==4||s.music!=='bgm_dreamland'||m.pickedTrack()!==null)throw Error('arena setup');
  const tex=m.textures.get(f.sheets.moves);if(!tex.customData.mobileAtlas||tex.getSourceImage().height>4096)throw Error('phone atlas');
  let poses=0;for(const [name,a]of Object.entries(f.def.moveAnims))for(const facing of [-1,1]){
   f.facing=facing;f.setState('attack');f.moveName=name;f.move=f.def.moves[name]||{frames:a[1]*a[2],hits:[]};
   for(let t=0;t<a[1]*a[2];t+=a[2]){f.t=t;m.frame++;m.draw();if(f.sprite.texture.key==='__MISSING'||!f.sprite.texture.has(f.sprite.frame.name))throw Error('missing '+name);poses++;}
  }
  for(const ledge of s.platforms){f.placeAt((ledge.x1+ledge.x2)/2,ledge.y-12);f.vy=3;f.grounded=false;for(let i=0;i<8;i++)f.physics({x:0,down:false});if(!f.grounded||f.platform!==ledge||f.y!==ledge.y)throw Error('landing failed');}
  for(let i=0;i<3600;i++)if(s.step(m).length)throw Error('decorative scenery dealt damage');
  f.setState('idle');f.facing=1;f.placeAt(-95,0);m.fighters[1].placeAt(-215,0);m.frame++;m.draw();
  return {poses,platforms:s.platforms.length,packed:true,foot:[f.sprite.originX,f.sprite.originY],stage:s.constructor.name};
 });
 await page.screenshot({path:'/tmp/rebirth-dreamland/fight.png'});
 assert.deepEqual(errors,[]);assert.ok(report.poses>200);console.log('PASS',JSON.stringify({menu,...report}));
}finally{await browser.close();await server.close();}

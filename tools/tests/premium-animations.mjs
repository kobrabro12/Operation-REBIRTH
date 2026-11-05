import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { readFileSync,mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();const url=server.resolvedUrls.local[0];
const browser=await chromium.launch({executablePath:process.env.SIM_CHROME||'/usr/bin/chromium',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--mute-audio','--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*',r=>{const u=r.request().url();if(u.includes('/npm/phaser@'))return r.fulfill({body:readFileSync('node_modules/phaser/dist/phaser.min.js'),contentType:'application/javascript'});return u.startsWith(url)?r.continue():r.abort();});
 await page.goto(url);await page.waitForFunction(()=>window.game?.scene.isActive('Title'),null,{timeout:120000});
 const specs=await page.evaluate(async()=>{
 const {PREMIUM_ANIMS}=await import('/src/fighters/premiumAnimsData.js'),{MatchScene}=await import('/src/scenes/MatchScene.js');MatchScene.prototype.update=function(){};
 return Object.entries(PREMIUM_ANIMS).map(([id,spec])=>{const split=id.indexOf(':');return {fighter:id.slice(0,split),name:id.slice(split+1),...spec};});
 });const results=[];
 for(const spec of specs){
  const result=await page.evaluate(async(spec)=>{const {settings}=await import('/src/settings.js'),{skinsFor}=await import('/src/fighters/skins.js'),P=await import('/src/progress.js');const si=skinsFor(spec.fighter).findIndex(s=>s.name===spec.name);P.grantItem(skinsFor(spec.fighter)[si].shop);
   for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);Object.assign(settings,{mode:'stock',stocks:3,cpuCount:1,p1Pad:null,extraPads:[],picks:[spec.fighter,'soul-summoner'],skins:[si,0],stage:'gravemoon-bridge',items:false,hazards:false,crt:false});window.game.scene.start('Match');await new Promise(r=>setTimeout(r,180));while(!window.game.scene.isActive('Match')||!window.game.scene.getScene('Match').fighters?.length)await new Promise(r=>setTimeout(r,30));const m=window.game.scene.getScene('Match'),f=m.fighters[0];m.countdown=0;m.intros=null;m.bigText.setText('');f.placeAt(-60,0);f.grounded=true;f.platform=m.stage.platforms[0];m.fighters[1].placeAt(200,0);
   if(!m.textures.exists(spec.key))throw Error('missing sheet');
   const before=JSON.stringify([f.x,f.y,f.vx,f.vy,f.percent,f.hp,f.invincible,f.grounded]);let frames=0;
   for(const facing of [-1,1]){f.facing=facing;f.setState('idle');f.t=1;for(let i=0;i<spec.idle[1];i++){f.anim=i*spec.idle[2]-1;m.draw();if(f.sprite.texture.key!==spec.idleKey||Number(f.sprite.frame.name)!==i||f.premiumAnimation!=='idle')throw Error('idle loop frame');if(Math.abs(f.sprite.originX-(f.sprite.flipX?1-spec.idleOrigin[0]:spec.idleOrigin[0]))>1e-9)throw Error('idle origin');frames++;}}
   for(const kind of ['flourish','taunt'])for(const facing of [-1,1]){
    f.facing=facing;f.setState(kind==='taunt'?'taunt':'idle');const [from,n,step]=spec[kind];
    for(let t=0;t<n*step;t+=step){f.t=t+(kind==='flourish'?120:0);m.draw();if(f.sprite.texture.key!==spec.key||Number(f.sprite.frame.name)!==from+Math.floor(t/step)||f.premiumAnimation!==kind)throw Error('incorrect frame '+kind+':'+t);if(Math.abs(f.sprite.originX-(f.sprite.flipX?1-spec.origin[0]:spec.origin[0]))>1e-9||f.sprite.originY!==spec.origin[1])throw Error('incorrect origin');frames++;}
   }
   const unchanged=before===JSON.stringify([f.x,f.y,f.vx,f.vy,f.percent,f.hp,f.invincible,f.grounded]);
   f.setState('idle');f.t=119;m.draw();const delayed=f.sprite.texture.key!==spec.key;f.t=192;m.draw();const recovered=f.sprite.texture.key!==spec.key;
   f.startAttack('jab');f.t=12;m.draw();const combat=f.sprite.texture.key!==spec.key;
   f.setState('taunt');f.t=f.def.taunt.frames-1;f.st_taunt({});const holds=f.state==='taunt';f.t=f.def.taunt.frames;f.st_taunt({});const ends=f.state==='idle';
   if(spec.fighter==='hero-knight'){f.swordOut=true;f.setState('idle');f.t=140;m.draw();if(f.sprite.texture.key===spec.key)throw Error('sword returned during flourish');f.swordOut=false;}
   f.setState('taunt');f.t=Math.floor(f.def.taunt.frames/2);m.draw();
   const {FighterIntros}=await import('/src/scenes/fighterIntros.js');f.setState('idle');f.t=1;m.countdown=200;m.intros=new FighterIntros(m);const e=m.intros.list[0],phases=new Set();let materialized=false;for(let i=0;i<195;i++){m.intros.step();m.draw();if(e.premiumPhase)phases.add(e.premiumPhase);materialized ||= f.sprite.alpha>0&&f.sprite.alpha<1;if(!Number.isFinite(f.sprite.x+f.sprite.y+f.sprite.scaleX))throw Error('invalid intro');}if(!m.intros.done||phases.size!==3||!materialized||Math.abs(f.sprite.y-f.y)>.01||f.sprite.alpha!==1)throw Error('intro did not settle');
   m.intros.done=false;m.intros.t=e.start+55;f.render(500);m.intros.draw();
   return {name:spec.name,intro:e.I.kind,introPhases:[...phases],frames,unchanged,delayed,recovered,combat,holds,ends,labels:spec.labels};
  },spec);
  for(const k of ['unchanged','delayed','recovered','combat','holds','ends'])assert.ok(result[k],spec.name+' '+k);assert.ok(result.frames>100);results.push(result);await page.screenshot({path:'recordings/test-output/'+spec.name.toLowerCase().replaceAll(' ','-')+'-new-taunt.png'});
  const preview=await page.evaluate(async(spec)=>{const {SHOP}=await import('/src/data/shop.js');window.game.scene.stop('Match');window.game.scene.start('Shop');await new Promise(r=>setTimeout(r,150));const s=window.game.scene.getScene('Shop');await s.openPreview(SHOP.flatMap(t=>t.items).find(i=>i.skin===spec.name));if(s.pv.seq[0].key!==spec.idleKey||s.pv.seq[0].n!==spec.idle[1])throw Error('shop custom idle');const clips=s.pv.seq.filter(a=>a.key===spec.key);if(clips.length!==2)throw Error('shop needs two clips');for(const clip of clips){s.pv.i=s.pv.seq.indexOf(clip);s.pv.t=clip.n;s.drawPreview(30);if(s.ovSpr.texture.key!==spec.key||s.ovSpr.originX!==spec.origin[0])throw Error('shop pose');}return clips.map(c=>c.label);},spec);assert.deepEqual(preview,spec.labels);
 }
 assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify(results));
}finally{await browser.close();await server.close();}

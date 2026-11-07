import {createServer} from 'vite';
import {chromium} from 'playwright-core';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';

const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});
await server.listen();const url=server.resolvedUrls.local[0];
const browser=await chromium.launch({executablePath:process.env.SIM_CHROME||'/usr/bin/chromium',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--mute-audio','--no-sandbox']});
const shots=process.env.KOMBAT_SHOTS||'/tmp/rebirth-kombat';mkdirSync(shots,{recursive:true});
try{
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/*',r=>{const u=r.request().url();if(u.includes('/npm/phaser@'))return r.fulfill({body:readFileSync('node_modules/phaser/dist/phaser.min.js'),contentType:'application/javascript'});return u.startsWith(url)?r.continue():r.abort();});
  await page.goto(url);await page.waitForFunction(()=>window.game?.scene?.isActive('Title'),null,{timeout:120000});
  const specs=await page.evaluate(async()=>{
    const {KOMBAT_COSTUMES}=await import('/src/data/kombatCostumes.js');
    const {MatchScene}=await import('/src/scenes/MatchScene.js'),{WinScene}=await import('/src/scenes/WinScene.js');
    MatchScene.prototype.update=function(){};window.drawKombatWin=WinScene.prototype.update;WinScene.prototype.update=function(){};
    return KOMBAT_COSTUMES;
  });
  assert.equal(specs.length,5);assert.equal(new Set(specs.map(c=>c.fighter)).size,5);
  const report=[];
  for(const c of specs){
    const purchase=await page.evaluate(async c=>{
      const P=await import('/src/progress.js'),{SHOP}=await import('/src/data/shop.js'),{skinsFor,skinUnlocked}=await import('/src/fighters/skins.js');
      const id='cos-mk-'+c.set,items=SHOP[0].items.filter(i=>i.id===id),si=skinsFor(c.fighter).findIndex(s=>s.name===c.name);
      if(items.length!==1||si<1||skinUnlocked(c.fighter,si))throw Error('duplicate or initially unlocked costume');
      const item=items[0];P.addCoins(-P.getCoins());
      if(P.buyItem(id,item.price))throw Error('free costume');
      P.addCoins(item.price);if(!P.buyItem(id,item.price)||!skinUnlocked(c.fighter,si)||P.getCoins()!==0)throw Error('purchase failed');
      if(P.buyItem(id,item.price))throw Error('duplicate purchase');
      return {skin:si,price:item.price};
    },c);assert.equal(purchase.price,1500);
    await page.evaluate(async({c,skin})=>{
      const {settings}=await import('/src/settings.js');
      for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);
      Object.assign(settings,{mode:'stock',stocks:3,cpuCount:1,p1Pad:null,extraPads:[],picks:[c.fighter,'young-link'],skins:[skin,0],stage:'sky-sanctum',training:true});
      window.game.scene.start('Match',{shopPreview:true,skipIntro:true});
    },{c,skin:purchase.skin});
    await page.waitForFunction(c=>window.game.scene.isActive('Match')&&window.game.scene.getScene('Match').fighters?.[0]?.def.id===c.fighter,c,{timeout:90000});
    const match=await page.evaluate(c=>{
      const m=window.game.scene.getScene('Match'),f=m.fighters[0];m.countdown=0;f.spawnFlash=0;f.state='idle';
      for(const key of Object.values(f.sheets))if(!m.textures.exists(key))throw Error('missing sheet '+key);
      const tx=m.textures.get(f.sheets.moves);
      for(const [name,a] of Object.entries(f.def.moveAnims))if(!tx.has(a[0]+a[1]-1))throw Error('missing animation '+name);
      for(const dir of [-1,1])for(const name of ['jab','fsmash','fair','bair','uair','dair']){
        if(!f.def.moves[name])continue;f.facing=dir;f.startAttack(name);
        for(let t=0;t<f.move.frames;t+=3){f.t=t;f.anim=t+110;m.draw();if(f.sprite.texture.key==='__MISSING')throw Error('missing attack sprite');}
      }
      const effects=[];
      for(const state of ['idle','run','attack']){f.state=state;f.anim=100;f.t=12;f.vx=state==='run'?3:0;m.draw();effects.push(f.fxBack.commandBuffer.length+f.fx.commandBuffer.length);}
      if(c.fighter==='aero'){
        f.enterFullAero(600);m.draw();if(!f.sheets.moves.startsWith('aero_subzero_king_'))throw Error('lost icy transformation');
        const king=m.textures.get(f.sheets.moves);for(const a of Object.values(f.def.moveAnims))if(!king.has(a[0]+a[1]-1))throw Error('missing full form move');f.exitFullAero();
      }
      f.state='idle';f.facing=1;f.anim=30;f.vx=0;m.draw();
      return {key:f.sprite.texture.key,effects};
    },c);
    assert.ok(match.key.startsWith(c.prefix));assert.ok(match.effects.every(n=>n>0),JSON.stringify({name:c.name,effects:match.effects}));
    await page.screenshot({path:shots+'/'+c.set+'-match.png'});
    await page.evaluate(async({c,skin})=>{
      window.game.scene.stop('Match');window.game.scene.start('Win',{preview:true,results:[{fighter:c.fighter,skin,slot:0,label:'WINNER'},{fighter:'young-link',skin:0,slot:1,label:'CPU'}]});
    },{c,skin:purchase.skin});
    await page.waitForFunction(()=>window.game.scene.isActive('Win'));
    const ending=await page.evaluate(c=>{
      const w=window.game.scene.getScene('Win'),phases=new Set(),zooms=new Set();
      if(w.cut.fn!=='mk_'+c.set||w.losers[0].def.id!=='young-link')throw Error('wrong ending or rival');
      for(let t=1;t<w.cut.len;t+=3){
        w.t=t-1;window.drawKombatWin.call(w);phases.add(w.cineFrame.shot);zooms.add(w.cineFrame.zoom);
        if(!Number.isFinite(w.cineWorld.x+w.cineWorld.y+w.hero.x+w.hero.y))throw Error('invalid cinematic geometry');
        if(w.hero.visible&&!w.hero.texture.key.startsWith(c.prefix))throw Error('costume disappeared in ending');
        if(w.hero.frame.name==='__MISSING')throw Error('missing ending frame');
      }
      w.t=235;window.drawKombatWin.call(w);
      return {phases:[...phases],zooms:[...zooms],rival:w.losers[0].def.id};
    },c);
    assert.equal(ending.phases.length,5);assert.ok(ending.zooms.length>=2);
    await page.screenshot({path:shots+'/'+c.set+'-outro.png'});
    report.push({name:c.name,...match,...ending});
  }
  await page.evaluate(()=>{window.game.scene.stop('Win');window.game.scene.start('Shop');});
  await page.waitForFunction(()=>window.game.scene.isActive('Shop'));
  for(const c of specs){
    const preview=await page.evaluate(async c=>{
      const {SHOP}=await import('/src/data/shop.js'),s=window.game.scene.getScene('Shop');
      const item=SHOP[0].items.find(i=>i.id==='cos-mk-'+c.set);await s.openPreview(item);
      const correct=s.pv?.def.id===c.fighter;s.closeOverlay();return correct;
    },c);assert.ok(preview);
  }
  assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify(report));
}finally{await browser.close();await server.close();}

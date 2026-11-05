import {createServer} from 'vite';
import {chromium} from 'playwright-core';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();const url=server.resolvedUrls.local[0];
const browser=await chromium.launch({executablePath:process.env.SIM_CHROME||'/usr/bin/chromium',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--mute-audio','--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*',r=>{const u=r.request().url();if(u.includes('/npm/phaser@'))return r.fulfill({body:readFileSync('node_modules/phaser/dist/phaser.min.js'),contentType:'application/javascript'});return u.startsWith(url)?r.continue():r.abort();});
 await page.goto(url);await page.waitForFunction(()=>window.game?.scene?.isActive('Title'),null,{timeout:120000});
 await page.evaluate(()=>{for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);window.game.scene.start('Treehouse');});await page.waitForFunction(()=>window.game.scene.isActive('Treehouse')&&window.game.scene.getScene('Treehouse').corners.length===11);
 await page.evaluate(()=>{const s=window.game.scene.getScene('Treehouse');for(const id of ['moonbound','skybreak'])if(!s.corners.some(c=>c.cartridge===id))throw Error('Missing physical campaign cartridge');s.openCartridge('moonbound');s.pickUp('moonbound');s.insert();});await page.waitForFunction(()=>window.game.scene.isActive('CampaignGame'));
 const initial=await page.evaluate(()=>{const s=window.game.scene.getScene('CampaignGame');if(s.id!=='moonbound'||s.progress.cleared.length!==1)throw Error('Bad Moonbound start');return{x:s.player.x,y:s.player.y};});
 await page.keyboard.down('ArrowRight');await page.keyboard.down('ArrowDown');await page.waitForTimeout(180);await page.keyboard.up('ArrowRight');await page.keyboard.up('ArrowDown');assert.ok(await page.evaluate(p=>{const s=window.game.scene.getScene('CampaignGame');return s.player.x>p.x&&s.player.y>p.y;},initial));
 const b=await page.locator('canvas').boundingBox(),before=await page.evaluate(()=>window.game.scene.getScene('CampaignGame').player.y);await page.mouse.move(b.x+b.width*203/640,b.y+b.height*329/360);await page.mouse.down();await page.waitForTimeout(160);await page.mouse.up();assert.ok(await page.evaluate(y=>window.game.scene.getScene('CampaignGame').player.y<y,before));
 await page.screenshot({path:'recordings/test-output/moonbound-village.png'});
 await page.evaluate(()=>{
  const s=window.game.scene.getScene('CampaignGame'),q={x:0,y:0,action:false,tap:false};
  s.player.x=320;s.player.y=275;s.step({...q,y:1});if(s.progress.room!==0)throw Error('Guardian gate can be skipped');
  s.openMenu('shop');const coins=s.progress.coins;if(s.buyUpgrade('power')||s.progress.coins!==coins)throw Error('Free upgrade');s.closeMenu();
  s.player.x=80;s.player.y=185;for(let t=0;t<260&&s.progress.room===0;t++)s.step({...q,x:1});if(s.progress.room!==1)throw Error('Connected walking exit broken');
  const e=s.enemies[0];s.player.x=e.x-35;s.player.y=e.y;s.facing={x:1,y:0};s.cooldown=0;const hp=e.hp;s.step({...q,action:true});if(e.hp!==hp-s.damage)throw Error('Sword does not hit');
  s.invincible=0;s.cooldown=0;s.player.x=s.enemies[1].x;s.player.y=s.enemies[1].y;const health=s.hp;s.step(q);if(s.hp>=health)throw Error('Enemy contact harmless');
  s.invincible=99999;
 });
 for(let region=0;region<3;region++){
  await page.evaluate(region=>{
   const s=window.game.scene.getScene('CampaignGame'),q={x:0,y:0,action:false,tap:false};
   const clear=()=>{for(let tries=0;s.enemies.length&&tries<150;tries++){const e=s.enemies[0];s.player.x=e.x-40;s.player.y=e.y;s.facing={x:1,y:0};s.cooldown=0;s.invincible=99999;s.step({...q,action:true});}if(s.enemies.length)throw Error('Encounter cannot be defeated');};
   for(let col=1;col<4;col++){
    const target=region*4+col;
    if(s.progress.room!==target){s.player.x=580;s.player.y=185;s.step({...q,x:1});}
    if(s.progress.room!==target)throw Error('Wrong connected room');clear();
    if(s.overlay==='win')break;
   }
   if(!s.progress.cleared.includes(region*4+3))throw Error('Guardian not completed');
  },region);
  await page.screenshot({path:`recordings/test-output/moonbound-guardian-${region+1}.png`});
  if(region<2)await page.evaluate(region=>{
   const s=window.game.scene.getScene('CampaignGame'),q={x:0,y:0,action:false,tap:false};
   while(s.progress.room%4){s.player.x=60;s.player.y=185;s.step({...q,x:-1});}
   s.openMenu('shop');const cash=s.progress.coins;if(!s.buyUpgrade('power')||s.progress.coins!==cash-6)throw Error('Workshop purchase failed');s.closeMenu();
   if(s.damage!==1+s.progress.power+(s.progress.cleared.includes(3)?1:0))throw Error('Power upgrade not applied');const power=s.progress.power;s.loadProgress(false);if(s.progress.power!==power||!s.progress.cleared.includes(region*4+3))throw Error('Partial adventure checkpoint lost');
   s.player.x=320;s.player.y=275;s.step({...q,y:1});if(s.progress.room!==(region+1)*4)throw Error('Freed guardian did not unlock deeper region');
  },region);
 }
 const moon=await page.evaluate(()=>{const s=window.game.scene.getScene('CampaignGame');if(!s.progress.won||s.progress.cleared.length!==12)throw Error('Adventure ending missing');const saved=JSON.parse(localStorage.getItem('rebirth.campaign.moonbound'));if(!saved.won||saved.power!==2)throw Error('Campaign did not save');s.eject();return saved;});await page.waitForFunction(()=>window.game.scene.isActive('Treehouse'));
 await page.evaluate(()=>{const s=window.game.scene.getScene('Treehouse');s.pickUp('skybreak');s.insert();});await page.waitForFunction(()=>window.game.scene.isActive('CampaignGame')&&window.game.scene.getScene('CampaignGame').id==='skybreak');
 await page.keyboard.down('Space');await page.keyboard.down('ArrowUp');await page.waitForTimeout(230);await page.keyboard.up('Space');await page.keyboard.up('ArrowUp');assert.ok(await page.evaluate(()=>{const s=window.game.scene.getScene('CampaignGame');return s.bullets.length>0&&s.player.y<177;}));
 await page.keyboard.press('P',{delay:80});await page.waitForFunction(()=>window.game.scene.getScene('CampaignGame').overlay==='pause');const frame=await page.evaluate(()=>window.game.scene.getScene('CampaignGame').frame);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.game.scene.getScene('CampaignGame').frame),frame);await page.keyboard.press('P',{delay:80});
 await page.evaluate(()=>{const s=window.game.scene.getScene('CampaignGame'),q={x:0,y:0,action:false,tap:false};s.stageFrame=54;s.step(q);if(!s.enemies.length)throw Error('Scrolling encounters missing');const e=s.enemies[0],score=s.score;s.bullets=[{x:e.x-7,y:e.y,w:8,h:3,dmg:1}];s.step(q);if(s.score<=score)throw Error('Flight weapon cannot hit');s.invincible=0;s.shots=[{x:s.player.x,y:s.player.y,w:5,h:5,vx:0,vy:0}];const hp=s.hp;s.step(q);if(s.hp!==hp-1)throw Error('Hostile fire harmless');s.hp=1;s.invincible=0;s.shots=[{x:s.player.x,y:s.player.y,w:5,h:5,vx:0,vy:0}];s.step(q);if(s.overlay!=='defeat')throw Error('Flight defeat missing');s.menuButtons[0].fn();if(s.overlay||s.hp!==s.maxHP||s.progress.sector!==0)throw Error('Checkpoint retry failed');});
 for(let sector=0;sector<9;sector++){
  if([2,5,8].includes(sector)){await page.evaluate(()=>{const s=window.game.scene.getScene('CampaignGame');s.invincible=999999;s.stageFrame=s.sector.duration-1;s.step({x:0,y:0,action:false,tap:false});s.draw();});await page.screenshot({path:`recordings/test-output/skybreak-flagship-${sector+1}.png`});}
  await page.evaluate(sector=>{
   const s=window.game.scene.getScene('CampaignGame'),q={x:0,y:0,action:false,tap:false};if(s.progress.sector!==sector)throw Error('Sector did not advance');s.invincible=999999;s.stageFrame=s.sector.duration-1;s.step(q);
   if(s.sector.boss){const boss=s.enemies.find(e=>e.boss);if(!boss)throw Error('Flagship missing');s.bullets=[{x:boss.x-7,y:boss.y,w:8,h:3,dmg:1}];s.step(q);if(boss.hp!==boss.maxHP-1)throw Error('Flagship armour missing');for(let i=0;i<100&&!s.overlay;i++){const e=s.enemies.find(e=>e.boss);if(!e)break;s.bullets=[{x:e.x-7,y:e.y,w:8,h:3,dmg:1+s.progress.power}];s.step(q);}}
   if(sector<8){if(s.overlay!=='hangar')throw Error('Hangar checkpoint missing');if(s.progress.power<3){const cash=s.progress.coins;if(!s.buyUpgrade('power')||s.progress.coins!==cash-6)throw Error('Flight workshop failed');}}
   else if(!s.progress.won||s.overlay!=='win')throw Error('Flight ending missing');s.draw();
  },sector);
  if([0,2,5,8].includes(sector))await page.screenshot({path:`recordings/test-output/skybreak-sector-${sector+1}.png`});
  if(sector<8)await page.evaluate(()=>window.game.scene.getScene('CampaignGame').nextSector());
 }
 await page.evaluate(()=>window.game.scene.getScene('CampaignGame').eject());await page.waitForFunction(()=>window.game.scene.isActive('Treehouse'));await page.reload();await page.waitForFunction(()=>window.game?.scene?.isActive('Title'),null,{timeout:120000});
 const persisted=await page.evaluate(()=>{const m=JSON.parse(localStorage.getItem('rebirth.campaign.moonbound')),s=JSON.parse(localStorage.getItem('rebirth.campaign.skybreak'));if(!m.won||!s.won||m.cleared.length!==12||s.sector!==8||s.power!==3)throw Error('Independent campaign saves lost');for(const scene of window.game.scene.getScenes(true))window.game.scene.stop(scene.scene.key);window.game.scene.start('CampaignGame',{id:'moonbound'});return m;});assert.equal(persisted.score,moon.score);await page.waitForFunction(()=>window.game.scene.getScene('CampaignGame').overlay==='win');await page.evaluate(()=>window.game.scene.getScene('CampaignGame').scene.restart({id:'skybreak'}));await page.waitForFunction(()=>{const s=window.game.scene.getScene('CampaignGame');return s.id==='skybreak'&&s.overlay==='win';});await page.evaluate(()=>{const s=window.game.scene.getScene('CampaignGame');s.loadProgress(true);const reset=JSON.parse(localStorage.getItem('rebirth.campaign.skybreak')),moon=JSON.parse(localStorage.getItem('rebirth.campaign.moonbound'));if(reset.won||reset.sector!==0||!moon.won)throw Error('New campaign reset was not saved independently');});assert.deepEqual(errors,[]);
 console.log('PASS five shelf cartridges, physical insert/eject, four-way touch/keyboard controls, 12 connected adventure areas and guardians, gates/sword/damage/workshop, all nine scrolling sectors and flagships, hangar upgrades, pause and independent saves/endings after reload');
}finally{await browser.close();await server.close();}

const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const page=await b.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=cb=>raf(t=>{if(!window.freezeGame)cb(t);});});
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:8897/');await page.waitForFunction(()=>window.game3d);await page.locator('#start').click();await page.evaluate(()=>window.freezeGame=true);await page.waitForTimeout(50);
 const results=await page.evaluate(async()=>{
  const {WEAPON_PATHS,takeUpgrade}=await import('./rules.js?v=7'),g=game3d,out=[];
  const setup=(hero,index,path)=>{g.select(hero,'forest',index);g.start();g.world.obstacles.length=0;g.world.patches.length=0;g.player.level=8;for(let i=0;i<3;i++)if(!takeUpgrade(g.player,'path:'+path))throw Error('route rejected');};
  const target=(x,z)=>{const e=g.spawn('golem',g.player.x+x,g.player.z+z);e.hp=e.maxHp=10000;e.cool=99;e.speed=0;return e;};
  const advance=(seconds)=>{for(let i=0;i<seconds*60;i++){g.step(1/60);g.vfx.update(1/60);}};
  const once=()=>{g.step(1/60);g.player.attack=99;};
  for(const [id,path]of Object.entries(WEAPON_PATHS)){
   const hero=['crossbow','shuriken','dark'].includes(path.weapon)?'silver':'scout',index=(hero==='silver'?['crossbow','shuriken','dark']:['rifle','shotgun','fire']).indexOf(path.weapon);
   setup(hero,index,id);const e=target(0,4);once();advance(.7);if(e.hp===e.maxHp)throw Error(id+' did not damage target');out.push(id);
  }
  setup('silver',0,'crossbow_pierce');const bolts=[target(0,4),target(0,6),target(0,8)];once();advance(.8);if(!bolts.every(e=>e.hp<e.maxHp))throw Error('Crossbow pierce missed aligned targets');
  setup('silver',1,'shuriken_return');const far=target(0,17);once();advance(2);if(far.maxHp-far.hp<20)throw Error('Returning blade failed outbound/return hits at full targeting range');
  setup('scout',2,'fire_burn');const burn=target(0,4);once();advance(.5);const hp=burn.hp;advance(1);if(burn.hp>=hp||!(burn.burnTime>0))throw Error('Burn did not persist after impact');
  setup('silver',2,'dark_gravity');const center=target(0,4),pulled=target(2.7,4),initial=pulled.x;once();advance(.8);if(!(pulled.x<initial-.1)||g.fields.length>3)throw Error('Gravity pull missing or unbounded');
  setup('scout',0,'rifle_pierce');const line=[target(0,3),target(0,5),target(0,7)];once();advance(.5);if(!line.every(e=>e.hp<e.maxHp))throw Error('Piercing did not reach aligned targets');
  for(let i=0;i<50;i++){g.vfx.fire(0,0,3,true);g.vfx.ice(0,0);g.vfx.lightning(0,0,3,3,true);g.vfx.update(.02);}
  if(g.vfx.active.length>g.vfx.limit)throw Error('VFX exceeded budget');g.vfx.clear();if(g.vfx.active.length)throw Error('VFX cleanup failed');
  return out;
 });
 assert.equal(results.length,12);assert.deepEqual(errors,[]);console.log('PASS all 12 routes damage targets; crossbow pierce, return, burn, pull, rifle pierce; VFX cap and cleanup');
 await page.close();
 for(const viewport of [{width:1440,height:900},{width:844,height:390},{width:390,height:844}]){
  const p=await b.newPage({viewport,hasTouch:viewport.width<1000});await p.goto(process.env.TEST_URL||'http://127.0.0.1:8897/');await p.waitForFunction(()=>window.game3d);await p.locator('#start').click();
  await p.evaluate(()=>{game3d.player.level=3;game3d.player.pending=1;game3d.grant(0);});assert.equal(await p.locator('.weapon-upgrade').count(),2);
  await p.locator('[data-upgrade="path:crossbow_hunt"]').click();assert.equal(await p.evaluate(()=>game3d.player.weaponPath.id),'crossbow_hunt');
  await p.evaluate(()=>{game3d.player.level=5;game3d.player.pending=1;game3d.grant(0);});assert.equal(await p.locator('.weapon-upgrade').count(),1);await p.locator('.weapon-upgrade').click();
  assert.equal(await p.evaluate(()=>game3d.state),'playing');assert.equal(await p.evaluate(()=>game3d.player.weaponPath.rank),2);await p.close();console.log('PASS route UI '+viewport.width+'x'+viewport.height);
 }
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});

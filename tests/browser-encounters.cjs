const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 for(const viewport of [{width:1440,height:900},{width:844,height:390},{width:390,height:844}]){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<1000}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=cb=>{window.renderNext=cb;return raf(t=>{if(!window.freezeGame)cb(t);});};});
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:8897/');await page.waitForFunction(()=>window.game3d);await page.locator('#start').click();await page.evaluate(()=>freezeGame=true);await page.waitForTimeout(50);
  const result=await page.evaluate(async()=>{
   const g=game3d,{experienceNeeded,seeded}=await import('./rules.js?v=33');Math.random=seeded(3301);g.audio.setMuted(true);
   const choose=()=>{let guard=0;while(g.state==='upgrade'&&guard++<60)document.querySelector('[data-upgrade]').click();};
   const advance=seconds=>{for(let i=0;i<seconds*30;i++){g.step(1/30);g.vfx.update(1/30);choose();}};
   const total=()=>{let n=g.player.xp;for(let l=1;l<g.player.level;l++)n+=experienceNeeded(l);return n;};
   const reset=()=>{g.start();g.world.obstacles.length=0;g.world.patches.length=0;g.world.sites.length=0;g.player.inv=10000;g.player.attack=10000;};
   for(const map of ['forest','snow','ash']){
    g.select('silver',map,0);reset();advance(43);if(g.encounter.mode!=='warning')throw Error('warning missing');
    const time=g.time,positions=g.enemies.map(e=>[e.x,e.z]);g.pause();g.step(3);if(g.time!==time||JSON.stringify(g.enemies.map(e=>[e.x,e.z]))!==JSON.stringify(positions))throw Error('pause advanced hunt');g.resume();advance(6);
    if(!g.encounter.hunt||g.encounter.hunt.remaining!==5||g.enemies.filter(e=>e.elite).length!==1)throw Error(map+' hunt formation missing');
    let rewards=0;const resolve=g.audio.resolve;g.audio.resolve=()=>rewards++;g.player.hp=60;
    for(const e of g.enemies)g.hurtEnemy(e,99999);g.step(1/30);choose();
    if(!g.encounter.hunt.rewarded||g.encounter.mode!=='rest'||rewards!==1||g.player.hp<=60)throw Error('hunt reward missing');
    const count=g.enemies.length;advance(5);if(g.enemies.length>count||rewards!==1||g.orbs.length)throw Error('rest spawned enemies, repeated reward or missed XP collection');g.audio.resolve=resolve;
   }
   reset();const e=g.spawn('mushroom',g.player.x+18,g.player.z);g.hurtEnemy(e,9999);const xp=e.xp;advance(11);if(total()!==0)throw Error('distant XP collected too early');advance(3);if(total()!==xp)throw Error('auto-aim distance strands XP');
   reset();for(let i=0;i<220;i++){const e=g.spawn('mushroom',g.player.x+18,g.player.z);g.hurtEnemy(e,9999);}const expected=g.orbs.reduce((n,o)=>n+o.xp,0);g.step(1/30);if(g.orbs.length>200||g.orbs.reduce((n,o)=>n+o.xp,0)+total()!==expected)throw Error('orb cap lost XP');
   reset();let max=0;for(let i=0;i<185*30;i++){g.step(1/30);g.vfx.update(1/30);max=Math.max(max,g.enemies.length);}if(max>30||!g.boss||g.encounter.mode!=='boss')throw Error('unbounded spawns or boss missing');
   reset();document.querySelector('[data-attack-mode=auto]').click();const first=g.spawn('golem',g.player.x+6,g.player.z),second=g.spawn('golem',g.player.x,g.player.z+6.2);first.speed=second.speed=0;first.cool=second.cool=99;g.step(1/30);first.x=g.player.x+6.2;second.z=g.player.z+6;g.step(1/30);if(Math.abs(g.controls.angle-Math.PI/2)>.01)throw Error('auto target flickered');second.z=g.player.z+2;g.step(1/30);if(Math.abs(g.controls.angle)>.01)throw Error('auto ignored urgent nearby target');document.querySelector('[data-attack-mode=manual]').click();
   reset();if(g.encounter.hunt||g.orbs.length||g.enemies.length||g.encounter.mode!=='opening')throw Error('restart leaked encounter');advance(43);for(let i=1;i<=4;i++)renderNext(performance.now()+i*34);
   return {max,phase:g.encounter.mode};
  });
  assert.equal(result.phase,'warning');
  for(const selector of ['#objective','#joystick','#dash','#aim-stick']){if(viewport.width>1000&&selector!=='#objective')continue;const r=await page.locator(selector).boundingBox();assert(r&&r.x>=0&&r.y>=0&&r.x+r.width<=viewport.width&&r.y+r.height<=viewport.height,selector+' fits screen');}
  if(process.env.OUTPUT_DIR)await page.screenshot({path:process.env.OUTPUT_DIR+'/encounters-v33-'+viewport.width+'.png'});
  assert.deepEqual(errors,[]);console.log('PASS warning, three regional hunts, single reward, rest, XP recovery, cap, boss, pause/reset',viewport.width,result);await page.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});

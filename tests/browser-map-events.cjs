const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 for(const [width,height,touch]of [[1440,900,false],[844,390,true],[390,844,true]]){
  const p=await browser.newPage({viewport:{width,height},hasTouch:touch}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=cb=>{window.nextFrame=cb;return raf(t=>{if(!window.freezeGame)cb(t)})};});
  await p.goto(process.env.TEST_URL||'http://127.0.0.1:8899/');await p.waitForFunction(()=>window.game3d,null,{timeout:60000});await p.locator('#start').click();await p.evaluate(()=>freezeGame=true);await p.waitForTimeout(60);
  const result=await p.evaluate(()=>{
   const g=game3d,results=[];const advance=(seconds,clearThreats=false)=>{for(let i=0;i<Math.ceil(seconds*60);i++){if(clearThreats)for(const e of g.enemies)e.alive=false;g.step(1/60);}};
   for(const map of ['forest','snow','ash']){
    g.select('silver',map,0);g.start();g.world.patches.length=0;g.player.inv=999;g.player.attack=999;
    const s=g.world.sites.find(s=>s.event&&s.event!=='ambush');s.availableAt=0;g.player.x=s.x;g.player.z=s.z;advance(2.2);if(s.state!=='active'||s.guards.length!==3)throw Error('event did not activate '+map);
    const snapshot=JSON.stringify(s.eventRun);g.pause();g.step(5);if(JSON.stringify(s.eventRun)!==snapshot)throw Error('paused event changed');g.resume();
    for(const e of s.guards){e.speed=0;e.cool=999;}
    if(map==='forest'){
     s.guards[0].x=s.x+1;s.guards[0].z=s.z;const before=s.eventRun.progress;advance(1);if(s.eventRun.progress!==before)throw Error('contested purification advanced');
     for(const e of g.enemies)e.alive=false;g.player.x=s.x+6;advance(1);if(s.eventRun.progress!==before)throw Error('remote purification advanced');g.player.x=s.x;advance(11,true);
    }else if(map==='snow'){
     for(const n of s.nodes){g.player.x=n.x;g.player.z=n.z;advance(1.3);}if(s.state!=='ready'||s.claimed)throw Error('crystals should require center claim');g.player.x=s.x;g.player.z=s.z;g.step(.01);
    }else{
     for(const e of g.enemies)e.alive=false;g.player.inv=0;g.player.hp=g.player.maxHp=1000;advance(6,true);if(g.player.hp===1000||!g.zones.some(z=>z.kind==='ember')&&s.eventRun.lastWarning<0)throw Error('forge hazard did not warn and damage');g.player.inv=999;advance(8,true);
    }
    if(!s.claimed||g.state!=='upgrade')throw Error('event reward missing '+map);document.querySelector('[data-upgrade]').click();const pending=g.player.pending;advance(.2);if(g.player.pending!==pending||g.state!=='playing')throw Error('reward repeated');results.push({map,event:s.event,progress:s.eventRun.progress});
   }return results;
  });assert.equal(result.length,3);assert.deepEqual(errors,[]);console.log('PASS all biome events, interrupted progress, pause, forge warning/damage and one-time skill rewards',width,result);
  // Inspect the live event and guide on each viewport.
  await p.evaluate(()=>{const g=game3d;g.select('silver','snow',0);g.start();const s=g.world.sites.find(s=>s.event==='beacons');s.availableAt=0;g.player.x=s.x;g.player.z=s.z;g.player.inv=999;for(let i=0;i<140;i++)g.step(1/60);const now=performance.now();for(let i=1;i<=10;i++)nextFrame(now+i*100);});
  if(process.env.OUTPUT_DIR)await p.screenshot({path:process.env.OUTPUT_DIR+'/map-event-'+width+'.png'});
  await p.locator('#battle-guide').click();assert((await p.locator('#dialog-content').textContent()).includes('熔炉泄压'));assert((await p.locator('#dialog-content').textContent()).includes('霜晶共鸣'));assert.deepEqual(errors,[]);await p.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});

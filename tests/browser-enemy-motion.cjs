const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=cb=>raf(t=>{if(!window.freezeGame)cb(t);});});
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:8897/');await page.waitForFunction(()=>window.game3d);await page.locator('#start').click();await page.evaluate(()=>window.freezeGame=true);
  const result=await page.evaluate(()=>{
   const g=game3d;g.world.obstacles.length=0;g.world.patches.length=0;g.player.inv=100;g.spawnBoss();const b=g.boss;
   b.wind=1.2;b.cool=10;for(let i=0;i<35;i++)g.step(1/60);const windStride=b.mesh.userData.stride;
   b.wind=0;b.recover=0;b.cool=10;b.charge=0;g.player.x=b.x+7;g.player.z=b.z;const before=b.mesh.rotation.y;g.step(1/60);const first=b.mesh.rotation.y;
   for(let i=0;i<45;i++)g.step(1/60);const final=b.mesh.rotation.y;
   return{windStride,firstTurn:Math.abs(Math.atan2(Math.sin(first-before),Math.cos(first-before))),remaining:Math.abs(Math.atan2(Math.sin(Math.PI/2-final),Math.cos(Math.PI/2-final)))};
  });
  assert(result.windStride<.08,`stationary boss marches during windup: ${result.windStride}`);
  assert(result.firstTurn<.2,`boss snaps ${result.firstTurn} radians in one frame`);
  assert(result.remaining<.2,'boss does not settle toward the player');
  const lunge=await page.evaluate(()=>{const g=game3d;g.select('silver','forest',0);g.start();g.world.obstacles.length=0;g.world.patches.length=0;g.player.inv=100;const e=g.spawn('wolf',g.player.x,g.player.z+4);e.cool=99;e.pounceDuration=e.pounce=.24;e.attackAngle=Math.PI;const origin=e.z;g.step(1/60);const first=origin-e.z;for(let i=0;i<6;i++)g.step(1/60);const middleStart=e.z;g.step(1/60);return{first,middle:middleStart-e.z};});
  assert(lunge.middle>lunge.first*2,`wolf lunge begins at full speed instead of gathering momentum: ${JSON.stringify(lunge)}`);
  const reach=await page.evaluate(()=>{const g=game3d,results=[];for(const kind of ['wolf','mushroom'])for(const dt of [1/60,1/30,.04]){g.select('silver','forest',0);g.start();g.world.obstacles.length=0;g.world.patches.length=0;g.player.inv=100;const e=g.spawn(kind,g.player.x,g.player.z+8),duration=kind==='wolf'?.24:.22,base=kind==='wolf'?14:10;e.cool=99;e.pounceDuration=e.pounce=duration;e.attackAngle=Math.PI;const origin=e.z;while(e.pounce>0)g.step(dt);results.push({kind,dt,actual:origin-e.z,expected:base*Math.ceil(duration/dt)*dt});}return results;});
  for(const sample of reach)assert(Math.abs(sample.actual-sample.expected)<.015,`lunge reach changed at ${sample.kind} ${sample.dt}s: ${JSON.stringify(sample)}`);
  const mixedReach=await page.evaluate(()=>{const g=game3d,results=[];for(const kind of ['wolf','mushroom']){g.select('silver','forest',0);g.start();g.world.obstacles.length=0;g.world.patches.length=0;g.player.inv=100;const e=g.spawn(kind,g.player.x,g.player.z+8),base=kind==='wolf'?14:10;e.cool=99;e.pounceDuration=e.pounce=kind==='wolf'?.24:.22;e.attackAngle=Math.PI;const origin=e.z;let elapsed=0,frame=0;while(e.pounce>0){const dt=frame++%2?.016666666666666666:.04;elapsed+=dt;g.step(dt);}results.push({kind,actual:origin-e.z,expected:base*elapsed});}return results;});
  for(const sample of mixedReach)assert(Math.abs(sample.actual-sample.expected)<.015,`mixed-frame lunge reach changed: ${JSON.stringify(sample)}`);
  const landing=await page.evaluate(()=>{const g=game3d;g.select('silver','forest',0);g.start();g.world.obstacles.length=0;g.world.patches.length=0;g.player.inv=100;const e=g.spawn('wolf',g.player.x,g.player.z+8);e.cool=99;e.pounceDuration=e.pounce=.24;e.attackAngle=Math.PI;while(e.pounce>0)g.step(1/60);const z=e.z;for(let i=0;i<5;i++)g.step(1/60);return Math.abs(z-e.z);});
  assert(landing<.05,`wolf slides ${landing} units during its landing pose`);
  assert.deepEqual(errors,[]);console.log('PASS boss stationary windup and gradual facing',result);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});

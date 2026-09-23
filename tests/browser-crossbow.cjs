const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=cb=>raf(t=>{if(!window.freezeGame)cb(t);});});
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:8897/');
  await page.waitForFunction(()=>window.game3d);
  assert(await page.getByRole('button',{name:'夜翎短弩'}).count());
  assert.equal(await page.getByRole('button',{name:'银鸦手枪'}).count(),0);
  await page.locator('#start').click();
  await page.evaluate(()=>window.freezeGame=true);
  const hit=await page.evaluate(()=>{
   const g=game3d;g.world.obstacles.length=0;g.world.patches.length=0;
   const e=g.spawn('golem',g.player.x,g.player.z+5);e.hp=e.maxHp=10000;e.cool=99;e.speed=0;
   const before=e.z;let frames=0;
   while(!(e.stagger>0)&&frames++<240)g.step(1/60);
   return {frames,stagger:e.stagger||0,push:e.z-before,marks:g.player.crossbowMark?.hits||0};
  });
  assert(hit.frames<240,'three bolts should trigger an impact');
  assert(hit.stagger>0,'ordinary monster should stagger');
  assert(hit.push>.15,'impact should push it away from the hunter');
  const bossHit=await page.evaluate(()=>{
   const g=game3d;g.select('silver','forest',0);g.start();g.world.obstacles.length=0;g.spawnBoss();
   const b=g.boss;b.x=g.player.x;b.z=g.player.z+5;b.mesh.position.set(b.x,0,b.z);b.hp=b.maxHp=10000;b.cool=99;b.recover=99;
   const startZ=b.z;for(let i=0;i<180;i++)g.step(1/60);
   return {push:b.z-startZ,damage:b.maxHp-b.hp};
  });
  assert(Math.abs(bossHit.push)<.001&&bossHit.damage>0,'boss should take bolt damage without knockback');
  const audio=await page.evaluate(async()=>{
   const {GameAudio}=await import('./audio.js?v=7'),out=[];
   for(const kind of ['crossbow','wave']){
    const context=new OfflineAudioContext(1,44100,44100),a=new GameAudio(context);a.setup();a.available=()=>a.ready&&a.nodes<100;
    if(kind==='wave')a.threat('wave');else a.shot('crossbow');
    const data=(await context.startRendering()).getChannelData(0);out.push(Math.sqrt(data.reduce((s,v)=>s+v*v,0)/data.length));
   }return out;
  });
  assert(audio.every(rms=>rms>.001),'crossbow and wave cues should be audible');
  const heavyCue=await page.evaluate(async()=>{
   const {GameAudio}=await import('./audio.js?v=7'),a=new GameAudio(new OfflineAudioContext(1,44100,44100));a.setup();a.available=()=>a.ready&&a.nodes<100;
   a.impact('crossbow');a.impact('crossbow',true);return a.cooldowns.has('impact-strong');
  });
  assert(heavyCue,'third-hit cue must survive another hit in the same frame');
  assert.deepEqual(errors,[]);
  console.log('PASS crossbow selection, third-hit stagger/knockback, boss immunity, bow and wave audio');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

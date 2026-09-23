const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=callback=>raf(time=>{if(!window.freezeGame)callback(time);});});
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:8897/');await page.waitForFunction(()=>window.game3d);
  const result=await page.evaluate(()=>{const g=game3d;g.select('silver','ash',0);g.start();window.freezeGame=true;g.world.obstacles.length=0;const vent=g.world.patches.find(p=>p.kind==='vent');if(!vent)return {vent:false};vent.phase=0;g.player.x=vent.x;g.player.z=vent.z;const e=g.spawn('golem',vent.x+1,vent.z);e.hp=e.maxHp=1000;e.speed=0;e.cool=99;for(let i=0;i<240;i++)g.step(1/60);return {vent:true,marker:!!vent.marker,playerHp:g.player.hp,enemyHp:e.hp,state:g.state};});
  assert(result.vent,'ash map should contain visible vent hazards');
  assert(result.marker,'vent should have an in-world warning marker');
  assert(result.playerHp<120&&result.enemyHp<1000,'a vent eruption should affect both player and monsters');
  assert.equal(result.state,'playing');assert.deepEqual(errors,[]);
  console.log('PASS ash vent warnings and shared player/monster damage on mobile');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});

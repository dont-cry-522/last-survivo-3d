const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:8897/');await page.waitForFunction(()=>window.game3d);
  for(const map of ['forest','snow','ash']){
   const state=await page.evaluate(map=>{
    const g=game3d;g.select('scout',map,0);g.start();g.player.inv=1000;
    for(let frame=0;frame<4520;frame++)g.step(.04);
    return {state:g.state,time:g.time,hp:g.player.hp,boss:!!g.boss?.alive,enemies:g.enemies.length,weather:g.world.weather.particles.length};
   },map);
   assert.equal(state.state,'playing',`${map} run ended unexpectedly`);assert(state.time>=180);assert(state.boss,`${map} boss did not arrive`);
   assert(state.enemies<=64,`${map} enemy count escaped cap`);assert(state.weather>0);console.log('PASS long run',map,JSON.stringify(state));
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});

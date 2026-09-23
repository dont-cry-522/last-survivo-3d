const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:8897/');await page.waitForFunction(()=>window.game3d,{},{timeout:60000});
  const stats=await page.evaluate(async()=>{
   const g=game3d,next=()=>new Promise(requestAnimationFrame);
   const run=async()=>{for(let i=0;i<18;i++){g.select(i%2?'scout':'silver',['forest','snow','ash'][i%3],i%3);g.start();await next();}};
   await run();await run();const before={...g.renderer.info.memory};await run();
   return {before,after:{...g.renderer.info.memory},state:g.state};
  });
  assert.equal(stats.state,'playing');
  assert(stats.after.geometries<=stats.before.geometries+10,`geometry count grew on restart: ${JSON.stringify(stats)}`);
  assert(stats.after.textures<=stats.before.textures+2,`texture count grew on restart: ${JSON.stringify(stats)}`);
  assert.deepEqual(errors,[]);console.log('PASS repeated map/hero restarts',JSON.stringify(stats));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});

const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const url=process.env.TEST_URL||'http://127.0.0.1:8897/';
 try{
  for(const mode of ['normal','no-cache','legacy']){
   const context=await browser.newContext(),page=await context.newPage(),errors=[],requests=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
   if(mode==='no-cache')await page.addInitScript(()=>{Object.defineProperty(globalThis,'caches',{value:{open:async()=>{throw Error('storage denied');}}});});
   if(mode==='legacy')await page.addInitScript(()=>{Object.defineProperty(globalThis,'DecompressionStream',{value:undefined});});
   await page.goto(url);await page.waitForFunction(()=>window.game3d,{},{timeout:60000});
   assert(await page.locator('#start').isEnabled());assert(await page.evaluate(()=>Object.entries(game3d.hero.userData.actions).every(([name,action])=>action.getClip().name===name)),'loaded clips must remain distinct');assert(!requests.some(u=>u.endsWith('animations.glb')));
   assert(await page.evaluate(()=>game3d.hero.userData.rig.scale.y===1.12));
   if(mode==='normal'){
    assert(!requests.some(u=>u.endsWith('.bin')||u.endsWith('.gltf')));
    await page.route('**/assets/characters/**',r=>r.abort());requests.length=0;
    await page.reload();await page.waitForFunction(()=>window.game3d,{},{timeout:60000});
    assert(!requests.some(u=>u.includes('/assets/characters/')),'Warm launch should need no character network requests');
   }
   assert.deepEqual(errors,[]);await context.close();console.log('PASS character delivery:',mode);
  }
  const page=await browser.newPage();await page.route('**/motion-*.json.gz',r=>r.fulfill({status:503,body:'Unavailable'}));
  await page.goto(url);await page.waitForFunction(()=>!document.querySelector('#asset-retry').hidden);
  assert(!(await page.locator('#start').isEnabled()));await page.unroute('**/motion-*.json.gz');await page.locator('#asset-retry').click();await page.waitForFunction(()=>window.game3d,{},{timeout:60000});
  console.log('PASS download failure shows retry and recovers');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=cb=>raf(t=>{if(!window.freezeGame)cb(t);});});
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:8897/');await page.waitForFunction(()=>window.game3d);
  await page.locator('#start').click();await page.evaluate(()=>window.freezeGame=true);
  const guide=page.locator('#battle-guide');assert(await guide.isVisible(),'combat guide must remain accessible during play');
  await page.evaluate(()=>{const g=game3d;g.spawn('mushroom',g.player.x+4,g.player.z);});
  assert.match(await page.locator('#encounter').innerText(),/蘑菇|蹦跳/,'new species must explain itself');
  await page.evaluate(()=>{const g=game3d;g.spawn('wolf',g.player.x+5,g.player.z);g.spawn('golem',g.player.x+6,g.player.z);g.spawn('spitter',g.player.x+7,g.player.z);g.spawn('shaman',g.player.x+8,g.player.z);});
  await guide.click();assert.equal(await page.evaluate(()=>game3d.state),'paused','reading combat help should pause danger');
  const text=await page.locator('#dialog').innerText();
  for(const name of ['蘑菇','狼','石怪','吐毒','祭司'])assert(text.includes(name),`${name} must be explained`);
  for(const meaning of ['蓄力','毒','首领','陨火','补给'])assert(text.includes(meaning),`${meaning} circle meaning missing`);
  await page.getByRole('button',{name:'继续远征'}).click();assert.equal(await page.evaluate(()=>game3d.state),'playing');
  await page.setViewportSize({width:390,height:844});await guide.click();
  const action=await page.getByRole('button',{name:'继续远征'}).boundingBox();
  assert(action&&action.y+action.height<=844,'portrait combat guide must keep its return action on screen: '+JSON.stringify(action));
  await page.getByRole('button',{name:'继续远征'}).click();
  await page.evaluate(()=>{const g=game3d;g.start();g.spawn('wolf',g.player.x+5,g.player.z);});
  assert.match(await page.locator('#encounter').innerText(),/林地狼/,'restarting must reintroduce species whose queued card was missed');
  assert.deepEqual(errors,[]);console.log('PASS first-sighting card and pausing combat guide for five species and circle colors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

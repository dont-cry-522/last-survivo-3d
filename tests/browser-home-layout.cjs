const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 for(const [width,height]of [[1440,900],[1280,720],[844,390],[390,844],[320,640]]){
  const p=await b.newPage({viewport:{width,height},hasTouch:width<1000}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(process.env.TEST_URL||'http://127.0.0.1:8899/',{waitUntil:'domcontentloaded',timeout:60000});await p.waitForFunction(()=>window.game3d&&!document.querySelector('#start').disabled,null,{timeout:60000});
  assert(await p.locator('header #offline-panel').count());assert(await p.locator('.map-heading [data-map-visibility=visible]').count());
  const fits=await p.evaluate(()=>document.querySelector('#menu').scrollWidth<=innerWidth);assert(fits,'menu horizontal overflow');
  if(width>=1200){const start=await p.locator('#start').boundingBox();assert(start.y+start.height<=height,'desktop start button below viewport');}
  await p.screenshot({path:(process.env.OUTPUT_DIR||'../../outputs')+`/v82-home-${width}.png`});
  await p.locator('#offline-panel summary').click();assert(await p.locator('#offline-download').isVisible());const panel=await p.locator('.offline-popover').boundingBox();assert(panel.x>=0&&panel.x+panel.width<=width&&panel.y+panel.height<=height,'offline panel clipped');
  await p.screenshot({path:(process.env.OUTPUT_DIR||'../../outputs')+`/v82-download-${width}.png`});
  await p.keyboard.press('Escape');assert(!(await p.locator('#offline-download').isVisible()));await p.locator('#offline-panel summary').click();await p.locator('#audio-settings summary').click();assert(!(await p.locator('#offline-download').isVisible()));await p.locator('#audio-settings summary').click();
  await p.locator('[data-hero=lingya]').click();await p.locator('#weapon-details summary').click();assert((await p.locator('#weapon-preview').innerText()).includes('獾兽'));await p.locator('#weapon-details summary').click();
  await p.locator('#travel-tab').click();await p.locator('[data-map=confluence]').click();assert((await p.locator('#map-description').innerText()).includes('无缝相连'));await p.locator('[data-map-visibility=visible]').click();await p.locator('#loadout-tab').click();await p.locator('[data-attack-mode=auto]').click();
  await p.locator('#start').click();assert.equal(await p.evaluate(()=>game3d.state),'playing');assert.equal(await p.evaluate(()=>game3d.world.exploration.mode),'visible');assert(!(await p.locator('#offline-panel summary').isVisible()));
  await p.locator('#pause').click();assert.equal(await p.evaluate(()=>game3d.state),'paused');assert.deepEqual(errors,[]);console.log(`PASS ${width}x${height}: header download, adjacent map visibility, layout bounds, popover dismissal, weapon details, selection and start`);await p.close();
 }
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});

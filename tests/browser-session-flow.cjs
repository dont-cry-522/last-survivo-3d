const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 for(const [width,height,touch] of [[1920,1080,false],[360,640,true],[320,568,true],[640,360,true],[844,390,true]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:touch}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=cb=>raf(t=>{if(!window.freezeGame)cb(t)});});
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:8899/');await page.waitForFunction(()=>window.game3d,null,{polling:100,timeout:60000});
  await page.locator('[data-hero=wraith]').click();await page.locator('[data-map=snow]').click();await page.locator('#weapons button').nth(2).click();
  await page.locator('#start').click();await page.evaluate(()=>{freezeGame=true;game3d.world.obstacles.length=0;game3d.world.patches.length=0;game3d.world.sites.length=0;game3d.player.inv=999;});await page.waitForTimeout(60);
  if(touch){
   const boxes=await Promise.all(['#joystick','#dash','#aim-stick'].map(s=>page.locator(s).boundingBox()));
   for(const r of boxes)assert(r.x>=0&&r.y>=0&&r.x+r.width<=width&&r.y+r.height<=height,'controls fit screen');
   for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert(!(Math.min(a.x+a.width,b.x+b.width)>Math.max(a.x,b.x)&&Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y)),'touch controls overlap '+width);}
  }
  if(process.env.OUTPUT_DIR&&width===320)await page.screenshot({path:process.env.OUTPUT_DIR+'/mobile-controls-v34-320.png'});
  await page.evaluate(()=>game3d.grant(160));let choices=0;
  while(await page.evaluate(()=>game3d.state==='upgrade')){await page.locator('[data-upgrade]').first().click();assert(++choices<8,'upgrade loop');}
  assert.equal(choices,3);assert.equal(await page.evaluate(()=>game3d.player.pending),0);
  const move=async()=>{
   if(touch){const r=await page.locator('#joystick').boundingBox();await page.mouse.move(r.x+r.width/2+30,r.y+r.height/2);await page.mouse.down();}
   else await page.keyboard.down('ArrowRight');
   const distance=await page.evaluate(()=>{const p=game3d.player,x=p.x,z=p.z;for(let i=0;i<6;i++)game3d.step(1/60);return Math.hypot(p.x-x,p.z-z);});
   if(touch)await page.mouse.up();else await page.keyboard.up('ArrowRight');assert(distance>.1,'movement stopped after upgrade/resume');
  };await move();
  await page.locator('#pause').click();const paused=await page.evaluate(()=>{const t=game3d.time;game3d.step(1);return game3d.state==='paused'&&game3d.time===t;});assert(paused);
  await page.getByRole('button',{name:'切换为自动攻击',exact:true}).click();assert.equal(await page.evaluate(()=>game3d.state),'paused');await page.getByRole('button',{name:'继续远征',exact:true}).click();await move();
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await page.evaluate(()=>game3d.state),'paused');await page.getByRole('button',{name:'继续远征',exact:true}).click();await move();
  await page.locator('#audio-settings summary').click();await page.locator('#music-volume').focus();const volume=await page.locator('#music-volume').inputValue();await page.keyboard.press('ArrowLeft');assert(Number(await page.locator('#music-volume').inputValue())<Number(volume));
  const stationary=await page.evaluate(()=>{const p=game3d.player,x=p.x,z=p.z;game3d.step(.1);return p.x===x&&p.z===z;});assert(stationary,'volume keys moved hero');await page.locator('#audio-settings summary').click();
  await page.evaluate(()=>{game3d.player.inv=0;game3d.damage(99999,0,0)});assert.equal(await page.evaluate(()=>game3d.state),'lost');await page.getByRole('button',{name:'再次远征',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>({level:game3d.player.level,pending:game3d.player.pending,state:game3d.state})),{level:1,pending:0,state:'playing'});
  await page.locator('#pause').click();await page.getByRole('button',{name:'结束本局',exact:true}).click();await page.getByRole('button',{name:'返回暂停',exact:true}).click();assert.equal(await page.evaluate(()=>game3d.state),'paused');
  await page.getByRole('button',{name:'结束本局',exact:true}).click();await page.getByRole('button',{name:'确认结束',exact:true}).click();assert.equal(await page.evaluate(()=>game3d.state),'menu');assert(await page.locator('#menu').isVisible());assert(await page.locator('#touch').isHidden());
  assert.deepEqual(errors,[]);console.log('PASS menu choices, 3 pending upgrades, movement, pause/mode/blur, volume, defeat/restart, exit confirmation',width+'x'+height);await page.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});

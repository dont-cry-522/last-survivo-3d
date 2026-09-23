const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  for(const [width,height,touch] of [[1280,800,false],[844,390,true],[390,844,true]]){
   const page=await browser.newPage({viewport:{width,height},hasTouch:touch}),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=callback=>raf(time=>{if(!window.freezeGame)callback(time);});});
   await page.goto(process.env.TEST_URL||'http://127.0.0.1:8897/');await page.waitForFunction(()=>window.game3d);
   assert.equal(await page.locator('[data-attack-mode="manual"]').getAttribute('aria-pressed'),'true');
   await page.locator('[data-attack-mode="auto"]').click();
   assert.equal(await page.locator('[data-attack-mode="auto"]').getAttribute('aria-pressed'),'true');
   await page.reload();await page.waitForFunction(()=>window.game3d);
   assert.equal(await page.locator('[data-attack-mode="auto"]').getAttribute('aria-pressed'),'true','attack mode should be remembered after reopening the page');
   await page.locator('#start').click();await page.evaluate(()=>window.freezeGame=true);
   const empty=await page.evaluate(()=>{for(let i=0;i<30;i++)game3d.step(1/60);return game3d.bullets.length;});
   assert.equal(empty,0,'auto mode should not fire without a target');
   const automatic=await page.evaluate(()=>{const g=game3d;g.world.obstacles.length=0;g.world.patches.length=0;const e=g.spawn('golem',g.player.x+5,g.player.z);e.hp=e.maxHp=10000;e.speed=0;e.cool=99;for(let i=0;i<110;i++)g.step(1/60);return {bullets:g.bullets.length,hp:e.hp,angle:g.controls.angle,hero:g.hero.rotation.y};});
   assert(automatic.hp<10000,'auto mode should aim at and repeatedly hit an enemy without pressing attack');
   assert(Math.abs(Math.atan2(Math.sin(automatic.angle-Math.PI/2),Math.cos(automatic.angle-Math.PI/2)))<.2,'auto mode should aim toward the nearby target');
   const clearTarget=await page.evaluate(()=>{const g=game3d;g.start();g.world.obstacles.length=0;g.world.patches.length=0;const hidden=g.spawn('golem',g.player.x+5,g.player.z),visible=g.spawn('wolf',g.player.x,g.player.z+6);hidden.speed=visible.speed=0;hidden.cool=visible.cool=99;g.world.obstacles.push({x:g.player.x+2.5,z:g.player.z,r:.75});for(let i=0;i<20;i++)g.step(1/60);return g.controls.angle;});
   assert(Math.abs(clearTarget)<.2,'auto mode should choose a visible enemy instead of shooting into a tree');
   if(touch){assert.equal(await page.locator('#aim-stick').isVisible(),false,'auto mode should hide the unused right attack stick');assert(await page.locator('#joystick').isVisible(),'movement stick should remain available');}
   await page.locator('#pause').click();assert.equal(await page.evaluate(()=>game3d.state),'paused');
   await page.getByRole('button',{name:'切换为手动攻击'}).click();assert.equal(await page.evaluate(()=>game3d.state),'paused','changing mode should preserve the paused run');
   await page.getByRole('button',{name:'继续远征'}).click();
   const quiet=await page.evaluate(()=>{const g=game3d;for(let i=0;i<150;i++)g.step(1/60);return g.bullets.length;});
   assert.equal(quiet,0,'manual mode should not fire while the player gives no attack input');
   if(touch)assert(await page.locator('#aim-stick').isVisible(),'switching back should restore the attack stick');
   assert.deepEqual(errors,[]);console.log('PASS selectable auto/manual combat',width+'x'+height);await page.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});

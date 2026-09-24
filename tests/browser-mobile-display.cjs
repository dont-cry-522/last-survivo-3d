const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const url=process.env.TEST_URL||'http://127.0.0.1:8897/';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  for(const mode of ['supported','denied','missing','native','desktop']){
   const page=await browser.newPage({viewport:mode==='desktop'?{width:1280,height:800}:{width:390,height:844},hasTouch:mode!=='desktop'}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(mode=>{
    const raf=requestAnimationFrame;window.requestAnimationFrame=cb=>{window.renderNext=cb;return raf(t=>{if(!window.freezeGame)cb(t);});};
    window.displayCalls=[];
    if(mode==='native'||mode==='desktop')return;
    let full=null;
    Object.defineProperty(document,'fullscreenElement',{get:()=>full});
    window.leaveFullscreen=async()=>{displayCalls.push('exit');full=null;document.dispatchEvent(new Event('fullscreenchange'));};
    document.exitFullscreen=window.leaveFullscreen;
    Element.prototype.requestFullscreen=async()=>{displayCalls.push('fullscreen');if(mode==='denied')throw new Error('Denied');full=document.documentElement;document.dispatchEvent(new Event('fullscreenchange'));};
    Object.defineProperty(screen.orientation,'lock',{value:mode==='missing'?undefined:async direction=>{displayCalls.push(direction);if(mode==='denied')throw new Error('Denied');}});
    Object.defineProperty(screen.orientation,'unlock',{value:()=>displayCalls.push('unlock')});
   },mode);
   await page.goto(url);await page.waitForFunction(()=>window.game3d,null,{polling:100,timeout:60000}).catch(async e=>{console.error(mode,errors,await page.locator('#asset-loading').textContent());throw e;});
   if(mode==='desktop'){
    assert(await page.locator('#landscape').isHidden());
    assert(await page.locator('.brand').isVisible());
   }else{
    assert(await page.locator('#landscape').isVisible());
    const buttons=await page.locator('header button:not([hidden]),header summary').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
    for(const r of buttons)assert(r.x>=0&&r.x+r.w<=390&&r.y>=0&&r.y+r.h<=844,'portrait header fits');
    for(let i=1;i<buttons.length;i++)assert(buttons[i-1].x+buttons[i-1].w<=buttons[i].x,'header actions do not overlap');
    await page.locator('#start').click();await page.evaluate(()=>{freezeGame=true;game3d.player.hp=73;});await page.waitForTimeout(100);
    const before=await page.evaluate(()=>({time:game3d.time,hp:game3d.player.hp,x:game3d.player.x,z:game3d.player.z}));
    await page.locator('#landscape').click();
    await page.waitForFunction(()=>!document.querySelector('#landscape').disabled,null,{polling:100});
    if(mode==='supported'){
     assert.deepEqual(await page.evaluate(()=>displayCalls.slice(0,2)),['fullscreen','landscape']);
     assert.equal(await page.locator('#landscape').textContent(),'退出全屏');
     assert.equal(await page.locator('#landscape').getAttribute('aria-pressed'),'true');
    }else{
     assert(await page.locator('#orientation-help').isVisible());
     assert.equal(await page.evaluate(()=>game3d.state),'paused','unsupported orientation pauses combat');
     assert(await page.locator('#dialog .orientation-note').isVisible(),'fallback explanation is inside the modal, not hidden behind it');
     assert.match(await page.locator('#dialog .orientation-note').textContent(),/自动旋转/);
    }
    await page.setViewportSize({width:844,height:390});
    await page.waitForFunction(()=>Math.abs(game3d.camera.aspect-844/390)<.001,null,{polling:100});
    assert(await page.locator('#orientation-help').isHidden());
    assert.deepEqual(await page.evaluate(()=>({time:game3d.time,hp:game3d.player.hp,x:game3d.player.x,z:game3d.player.z})),before,'rotation preserves the current run');
    if(await page.evaluate(()=>game3d.state==='paused'))await page.getByRole('button',{name:'继续远征',exact:true}).click();
    for(const selector of ['#joystick','#dash','#aim-stick']){
     const r=await page.locator(selector).boundingBox();assert(r.x>=0&&r.y>=0&&r.x+r.width<=844&&r.y+r.height<=390,'landscape controls fit');
    }
    const cdp=await page.context().newCDPSession(page),left=await page.locator('#joystick').boundingBox(),right=await page.locator('#aim-stick').boundingBox();
    const a={x:left.x+56,y:left.y+56,id:1},b={x:right.x+56,y:right.y+56,id:2};
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a,b]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...a,x:a.x+28},{...b,x:b.x+34}]});
    const moving=await page.evaluate(()=>{game3d.world.obstacles.length=0;const x=game3d.player.x,z=game3d.player.z;game3d.step(1/60);return {held:game3d.controls.held,d:Math.hypot(game3d.player.x-x,game3d.player.z-z)};});
    assert(moving.held&&moving.d>.01,'both sticks work after rotating');
    // Rotating while fingers are down must not leave a held shot or movement.
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(()=>!game3d.controls.held,null,{polling:100});
    const stopped=await page.evaluate(()=>{const x=game3d.player.x,z=game3d.player.z;game3d.step(1/60);return Math.hypot(game3d.player.x-x,game3d.player.z-z);});
    assert.equal(stopped,0,'rotation clears movement');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    if(mode==='supported'){
     await page.locator('#landscape').click();
     assert.equal(await page.locator('#landscape').textContent(),'横屏');
     assert.equal(await page.locator('#landscape').getAttribute('aria-pressed'),'false');
     assert((await page.evaluate(()=>displayCalls)).includes('unlock'));
     await page.locator('#landscape').click();await page.evaluate(()=>leaveFullscreen());
     assert.equal(await page.locator('#landscape').textContent(),'横屏','system fullscreen exit restores the button');
    }
    if(process.env.OUTPUT_DIR&&mode==='supported'){
     await page.setViewportSize({width:844,height:390});
     await page.evaluate(()=>renderNext(performance.now()));
     await page.screenshot({path:process.env.OUTPUT_DIR+'/mobile-landscape-v32.png'});
    }
   }
   assert.deepEqual(errors,[]);console.log('PASS mobile display',mode);await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

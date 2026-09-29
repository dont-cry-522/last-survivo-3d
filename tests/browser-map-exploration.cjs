const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
const url=process.env.TEST_URL||'http://127.0.0.1:8899/';
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 for(const [width,height] of [[1440,900],[844,390],[390,844]]){
  const p=await b.newPage({viewport:{width,height},hasTouch:width<1000}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=cb=>{window.nextFrame=cb;return raf(t=>{if(!window.freezeGame)cb(t);});};});
  const ready=()=>p.waitForFunction(()=>window.game3d&&!document.querySelector('#start').disabled,null,{timeout:60000});
  await p.goto(url,{waitUntil:'domcontentloaded',timeout:60000});await ready();
  await p.locator('[data-map="confluence"]').click();await p.locator('[data-map-visibility="explore"]').click();
  assert.equal(await p.locator('[data-map-visibility="explore"]').getAttribute('aria-pressed'),'true');
  await p.screenshot({path:(process.env.OUTPUT_DIR||'../../outputs')+`/v76-menu-${width}.png`});
  await p.locator('#start').click();await p.evaluate(()=>freezeGame=true);await p.waitForTimeout(70);
  for(const map of ['confluence','forest','snow','ash','sand','coast']){
   const result=await p.evaluate(map=>{
    const g=game3d;g.select('silver',map,0);g.start();g.player.inv=999;g.player.attack=999;
    const e=g.world.exploration,spawn={x:g.player.x,z:g.player.z},initial=e.count,half=e.half;
    const pixel=(x,z)=>Array.from(document.querySelector('#map canvas').getContext('2d').getImageData(Math.floor(72+x*64/half),Math.floor(72+z*64/half),1,1).data).slice(0,3);
    const hidden=pixel(half-10,half-10);
    // Nothing on the far map, including terrain and region labels, leaks through fog.
    g.pause();g.player.x=half-10;g.player.z=half-10;g.step(.016);const paused=e.count===initial;g.resume();g.step(.016);
    const reveal=e.known(g.player.x,g.player.z),retained=e.known(spawn.x,spawn.z),grew=e.count>initial;
    g.pause();let t=performance.now();for(let i=0;i<6;i++)nextFrame(t+=40);
    const oldTerrain=pixel(spawn.x,spawn.z);g.resume();g.start();const fresh=g.world.exploration;
    return {hidden,paused,reveal,retained,grew,oldTerrain,reset:!fresh.known(half-10,half-10),mode:fresh.mode};
   },map);
   assert.deepEqual(result.hidden,[5,11,14],map+' unseen terrain not black');assert(result.paused);assert(result.reveal);assert(result.retained);assert(result.grew);assert(result.reset);assert.equal(result.mode,'explore');assert.notDeepEqual(result.oldTerrain,[5,11,14],map+' visited ground lost');
  }
  await p.evaluate(()=>{game3d.select('silver','confluence',0);game3d.start();let t=performance.now();for(let i=0;i<8;i++)nextFrame(t+=17);});
  await p.screenshot({path:(process.env.OUTPUT_DIR||'../../outputs')+`/v76-fog-${width}.png`});
  await p.evaluate(()=>game3d.menu());await p.locator('[data-map-visibility="visible"]').click();await p.locator('#start').click();
  const visible=await p.evaluate(()=>({mode:game3d.world.exploration.mode,pixel:Array.from(document.querySelector('#map canvas').getContext('2d').getImageData(125,125,1,1).data).slice(0,3)}));
  assert.equal(visible.mode,'visible');assert.notDeepEqual(visible.pixel,[5,11,14]);
  await p.reload({waitUntil:'domcontentloaded'});await ready();assert.equal(await p.locator('[data-map-visibility="visible"]').getAttribute('aria-pressed'),'true');
  await p.locator('[data-map-visibility="explore"]').click();await p.reload({waitUntil:'domcontentloaded'});await ready();assert.equal(await p.locator('[data-map-visibility="explore"]').getAttribute('aria-pressed'),'true');
  await p.evaluate(()=>{Storage.prototype.setItem=()=>{throw Error('blocked');};});await p.locator('[data-map-visibility="visible"]').click();await p.locator('#start').click();assert.equal(await p.evaluate(()=>game3d.world.exploration.mode),'visible');
  assert.deepEqual(errors,[]);console.log(`PASS ${width}x${height}: six maps, fog pixels, exploration retention/reset, pause, full visibility, reload preferences and blocked storage`);await p.close();
 }
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});

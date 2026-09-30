const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{for(const [width,height] of [[1440,900],[844,390],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:width<1000}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',e=>{if(e.type()==='error'&&e.text().includes('THREE.WebGL'))errors.push(e.text());});
  await page.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=cb=>{window.nextFrame=cb;return raf(t=>{if(!window.freezeGame)cb(t);});};});
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:8899/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.game3d&&!document.querySelector('#start').disabled,null,{timeout:60000});
  await page.locator('[data-hero=tide]').click();await page.locator('#travel-tab').click();
  await page.locator('[data-map=coast]').click();await page.locator('[data-map-visibility=visible]').click();
  await page.locator('#start').click();await page.evaluate(()=>freezeGame=true);await page.waitForTimeout(60);
  const result=await page.evaluate(async()=>{
   const version=document.querySelector('script[src^="main.js"]').src.split('?')[1],g=game3d;
   const {terrainAt}=await import('./water.js?'+version),{updateTide}=await import('./coast.js?'+version),{clearAt,moveActor}=await import('./world.js?'+version);
   const check=(value,message)=>{if(!value)throw Error(message);},reports=[];
   for(const map of ['forest','snow','ash','sand','coast']){
    g.select('tide',map,0);g.start();g.player.inv=999;g.player.attack=999;
    check(g.world.half===96,'old world size '+map);check(g.world.discoveries.length===5,'missing outer discoveries '+map);
    check(g.world.discoveries.slice(3).every(n=>!n.discovered&&n.availableAt>=115),'late finds revealed early '+map);
    check(g.world.exploration.half===96,'wrong map coordinates '+map);
    for(const n of [g.world.spawn,...g.world.sites,...g.world.discoveries,...g.world.roaming])check(clearAt(g.world,n.x,n.z,.5),'blocked destination '+map);
    const time=g.time;g.pause();g.step(4);check(g.time===time,'pause moves world');g.resume();
    reports.push({map,sites:g.world.sites.length,finds:g.world.discoveries.length});
   }
   const w=g.world;check(w.coastLayout&&w.bridges.length===4,'coast layout absent');
   check(['warehouse','dock','wreck','beacon'].every(kind=>w.districts.some(d=>d.kind===kind)),'missing harbor district');
   updateTide(w,21);
   for(const b of w.bridges){
    const c=Math.cos(b.angle),s=Math.sin(b.angle),actor={x:b.x-c*b.width/2,z:b.z+s*b.width/2};
    for(let d=-b.width/2;d<=b.width/2;d+=.3){const x=b.x+c*d,z=b.z-s*d;check(terrainAt(w,x,z).kind==='bridge','rotated bridge does not cover deck');check(clearAt(w,x,z,.45),'obstacle on deck');}
    for(let i=0;i<100;i++)moveActor(w,actor,c*b.width/100,-s*b.width/100,.45);
    check(Math.hypot(actor.x-(b.x+c*b.width/2),actor.z-(b.z-s*b.width/2))<.1,'cannot cross bridge');
   }
   check(terrainAt(w,w.coastLayout.island.x,w.coastLayout.island.z).depth===0,'island floods');
   for(const site of w.sites)check(terrainAt(w,site.x,site.z).depth===0,'reward floods');
   for(const f of w.fords){updateTide(w,1);check(terrainAt(w,f.x,f.z).kind==='ford','low-tide path absent');updateTide(w,21);check(terrainAt(w,f.x,f.z).kind==='water','high tide leaves ford dry');}
   // Render the exact generated map in the normal combat camera and a review overview.
   const renderAt=(x,z)=>{g.player.x=x;g.player.z=z;g.hero.position.set(x,0,z);g.camera.position.set(x+16,25,z+20);g.camera.lookAt(x,0,z);g.camera.updateMatrixWorld(true);g.renderer.shadowMap.needsUpdate=true;g.renderer.render(g.vfx.scene,g.camera);return g.renderer.domElement.toDataURL();};
   const b=w.bridges[0],deck=renderAt(b.x,b.z),calls=g.renderer.info.render.calls;
   check(calls<450,'coast normal-camera draw budget '+calls);
   const T=await import('./vendor/three.module.js'),camera=new T.OrthographicCamera(-105,105,105, -105,.1,500);
   camera.position.set(0,210,.01);camera.up.set(0,0,-1);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
   const fog=g.vfx.scene.fog;g.vfx.scene.fog=null;g.renderer.render(g.vfx.scene,camera);const overview=g.renderer.domElement.toDataURL();g.vfx.scene.fog=fog;
   renderAt(b.x,b.z);return{reports,calls,ponds:w.ponds.length,bridges:w.bridges.length,fords:w.fords.length,deck,overview};
  });
  assert.deepEqual(errors,[]);
  if(process.env.OUTPUT_DIR)for(const key of ['deck','overview'])fs.writeFileSync(`${process.env.OUTPUT_DIR}/harbor-${key}-${width}.png`,Buffer.from(result[key].split(',')[1],'base64'));
  delete result.deck;delete result.overview;console.log('PASS enlarged worlds, late rewards, dry island, rotated bridge traversal, tide crossings and render budget',width,JSON.stringify(result));
  await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'../../mobile-check/node_modules/playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const p=await b.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(process.env.TEST_URL||'http://127.0.0.1:8898/',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.game3d,null,{polling:100,timeout:90000});
 await p.evaluate(async()=>{
  const T=await import('./vendor/three.module.js'),r=game3d.renderer,render=r.render.bind(r);window.previewChecks=[];
  r.render=(scene,camera)=>{if(game3d.state==='menu'){
   const box=new T.Box3().setFromObject(game3d.hero,true);if(game3d.companionMesh)box.union(new T.Box3().setFromObject(game3d.companionMesh,true));
   const rect=document.querySelector('#hero-preview').getBoundingClientRect();let max=0;for(const x of[box.min.x,box.max.x])for(const y of[box.min.y,box.max.y])for(const z of[box.min.z,box.max.z]){const v=new T.Vector3(x,y,z).project(camera);const px=(v.x+1)*innerWidth/2,py=(1-v.y)*innerHeight/2;max=Math.max(max,Math.abs((px-rect.left)/rect.width*2-1),Math.abs((py-rect.top)/rect.height*2-1));}
   previewChecks.push({hero:game3d.player.heroId,weapon:game3d.player.weaponId,max,worldVisible:scene.children.includes(game3d.world.group)&&game3d.world.group.visible,background:scene.background?.getHexString()});
  }return render(scene,camera);};
 });
 for(const id of ['scout','silver','wraith','tide','lingya']){
  await p.locator('[data-hero='+id+']').click();const count=await p.locator('#weapons button').count();
  for(let i=0;i<count;i++){
   await p.locator('#weapons button').nth(i).click();await p.evaluate(()=>previewChecks.length=0);await p.waitForFunction(()=>previewChecks.length>=8,null,{polling:100});
   const check=await p.evaluate(()=>({samples:previewChecks,restored:game3d.hero.parent===game3d.world.group.parent&&game3d.hero.position.x===game3d.player.x&&game3d.hero.position.z===game3d.player.z}));
   assert(check.restored,'preview changed the actor world transform');assert(check.samples.every(x=>x.worldVisible&&x.background),'selected map absent from preview');assert(check.samples.every(x=>x.max<.98),JSON.stringify(check));
  }
  await p.screenshot({path:'../../outputs/v83-portrait-'+id+'.png'});console.log('PASS full-body and weapon framing: '+id+' ('+count+' weapons)');
 }
 await p.locator('#travel-tab').click();await p.keyboard.press('ArrowLeft');assert.equal(await p.locator('#loadout-tab').getAttribute('aria-selected'),'true');await p.keyboard.press('End');assert.equal(await p.locator('#travel-tab').getAttribute('aria-selected'),'true');await p.locator('[data-map=coast]').click();assert((await p.locator('#selected-map-name').innerText()).includes('幽潮'));await p.screenshot({path:'../../outputs/v83-travel.png'});
 for(const map of ['forest','snow','ash','sand','coast','confluence']){await p.locator('[data-map='+map+']').click();await p.evaluate(()=>previewChecks.length=0);await p.waitForFunction(()=>previewChecks.length>=5,null,{polling:100});assert(await p.evaluate(()=>previewChecks.every(x=>x.worldVisible&&x.background)), 'missing map scenery');assert.equal(await p.locator('#preview-map-name').innerText(),await p.locator('#selected-map-name').innerText());await p.screenshot({path:'../../outputs/v83-scene-'+map+'.png'});}
 for(const [width,height]of [[844,390],[390,844],[320,640],[1280,720]]){
  await p.setViewportSize({width,height});await p.evaluate(()=>previewChecks.length=0);await p.waitForFunction(()=>previewChecks.length>=5,null,{polling:100});assert(await p.evaluate(()=>previewChecks.every(x=>x.max<.98)),'resize cropped preview');
 }
 await p.locator('#start').click();await p.waitForFunction(()=>game3d.state==='playing',null,{polling:100});
 assert(await p.evaluate(async()=>{const T=await import('./vendor/three.module.js'),v=game3d.renderer.getViewport(new T.Vector4());return !game3d.renderer.getScissorTest()&&v.x===0&&v.y===0&&v.z===innerWidth&&v.w===innerHeight&&game3d.camera.aspect===innerWidth/innerHeight;}),'combat viewport not restored');
 await p.evaluate(()=>game3d.menu());await p.waitForFunction(()=>game3d.state==='menu'&&previewChecks.length>5,null,{polling:100});assert.deepEqual(errors,[]);console.log('PASS tabs, map summary, responsive portrait, combat renderer restoration and return to menu');
 await p.close();
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});

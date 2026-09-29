const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{for(const[width,height]of[[1440,900],[844,390],[390,844]]){
 const p=await b.newPage({viewport:{width,height},hasTouch:width<1000}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!m.location().url.endsWith('/favicon.ico'))errors.push(m.text()+' '+m.location().url)});
 await p.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=cb=>{window.nextFrame=cb;return raf(t=>{if(!window.freezeGame)cb(t)})}});
 await p.goto(process.env.TEST_URL||'http://127.0.0.1:8899/',{waitUntil:'domcontentloaded',timeout:60000});await p.waitForFunction(()=>window.game3d&&!document.querySelector('#start').disabled,null,{polling:200,timeout:60000});await p.locator('#start').click();await p.evaluate(()=>freezeGame=true);await p.waitForTimeout(60);
 for(const id of['forest','snow','ash','sand','coast']){
  const result=await p.evaluate(async id=>{const g=game3d,{animateWorld}=await import('./world.js?v=71'),{SMALL_FINDS}=await import('./map-discoveries.js?v=71'),check=(v,m)=>{if(!v)throw Error(id+': '+m)};
   g.select('lingya',id,0);g.start();g.player.inv=999;g.player.attack=999;g.controls.held=false;g.player.level=10;g.player.xp=0;g.player.pending=0;g.player.hp=g.player.maxHp/2;
   const n=g.world.discoveries[0];check(g.world.discoveries.length===3,'find count');g.player.x=n.x+5;g.player.z=n.z;g.step(.02);check(!n.discovered,'time gate');n.availableAt=0;n.phase=0;g.step(.02);check(n.discovered&&n.mesh.visible&&!n.claimed,'proximity reveal');
   g.pause();const progress=n.progress;g.player.x=n.x;g.step(3);check(n.progress===progress&&!n.claimed,'pause');g.resume();
   const e=g.spawn('golem',n.x,n.z+2);check(e,'enemy spawn');e.speed=0;e.cool=999;g.step(.02);check(!n.claimed&&n.contested,'enemy blocks');e.alive=false;e.mesh.visible=false;
   const xp=g.player.xp,hp=g.player.hp;
   if(id==='snow'){g.player.x=n.nodes[0].x;g.step(.02);check(n.progress===1&&!n.claimed,'first crystal');g.player.x=n.nodes[1].x;g.step(.02);}
   else if(id==='ash'){n.phase=5;g.step(.02);check(n.blocked&&!n.claimed,'hot');n.phase=0;g.step(.02);}
   else if(id==='sand'){for(let i=0;i<130;i++)g.step(.02);}
   else g.step(.02);
   check(n.claimed,'collection');check(g.player.xp===xp+SMALL_FINDS[id].xp,'reward XP');check(g.player.hp>=hp+Math.ceil(g.player.maxHp*SMALL_FINDS[id].heal),'heal');const once=g.player.xp;g.step(.02);check(g.player.xp===once,'duplicate reward');check(n.markers.every(m=>!m.visible),'marker not removed');
   // Preview unclaimed props, then verify replay resets every node.
   g.start();check(g.world.discoveries.every(n=>!n.claimed&&!n.discovered),'restart');const f=g.world.discoveries[0];f.availableAt=0;g.player.x=f.x-3;g.player.z=f.z+2;g.player.inv=999;g.player.attack=999;g.step(.02);for(let i=1;i<=5;i++)nextFrame(performance.now()+i*40);check(document.querySelector('#objective-detail').textContent.includes(SMALL_FINDS[id].name),'objective hint');animateWorld(g.world,2,g.player.x,g.player.z);
   g.camera.position.set(f.x+12,19,f.z+15);g.camera.lookAt(f.x,0,f.z);g.camera.updateMatrixWorld(true);g.renderer.shadowMap.needsUpdate=true;g.renderer.render(g.vfx.scene,g.camera);
   check(g.renderer.info.render.calls<650,'render calls');check(g.renderer.info.programs.every(p=>p.diagnostics?.runnable!==false),'shader compilation');for(const m of g.world.scenery.batches){const u=m.material.userData.motion;if(u)check(u.clock.value===2,'wind uniform');}
   return{id,drawCalls:g.renderer.info.render.calls};
  },id);
  if(process.env.OUTPUT_DIR&&width===1440){await p.evaluate(()=>{let s=document.querySelector('#capture-hide');if(!s){s=document.createElement('style');s.id='capture-hide';s.textContent='body > :not(canvas){visibility:hidden!important}';document.head.append(s)}});await p.screenshot({path:process.env.OUTPUT_DIR+'/map-v71-'+id+'.png'});}console.log('PASS '+width+'x'+height+' '+JSON.stringify(result));
 }
 await p.evaluate(()=>document.querySelector('#capture-hide')?.remove());await p.locator('#battle-guide').click();assert((await p.locator('#dialog-content').textContent()).includes('潮赠贝簇'));assert((await p.locator('#dialog-content').textContent()).includes('浅黄色小方点'));if(process.env.OUTPUT_DIR&&width===844)await p.screenshot({path:process.env.OUTPUT_DIR+'/map-guide-v71-mobile.png'});assert.deepEqual(errors,[]);await p.close();
}}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});

const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
for(const [width,height]of [[1440,900],[844,390],[390,844]]){
 const p=await b.newPage({viewport:{width,height},hasTouch:width<1000}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=cb=>{window.nextFrame=cb;return raf(t=>{if(!window.freezeGame)cb(t)})}});
 await p.goto(process.env.TEST_URL||'http://127.0.0.1:8899/',{waitUntil:'domcontentloaded',timeout:60000});await p.waitForFunction(()=>window.game3d&&!document.querySelector('#start').disabled,null,{polling:200,timeout:60000});await p.locator('[data-attack-mode=manual]').click();await p.locator('#start').click();await p.evaluate(()=>freezeGame=true);await p.waitForTimeout(60);
 const rows=await p.evaluate(async width=>{
 const {animateActor}=await import('./world.js?v=70'),g=game3d,rows=[],check=(v,m)=>{if(!v)throw Error(m)};
 for(const hero of ['guardian','tide','lingya'])for(const fps of width===1440?[15,30,60,120]:[60]){
  g.select(hero,'forest',0);g.start();const d=g.hero.userData,joints=[d.offArm,d.aimArm,d.offForearm,d.firingForearm,d.swimLeftLeg,d.swimRightLeg,d.swimLeftKnee,d.swimRightKnee];let previous=null,maxJoint=0,maxBody=0,minHand=99,maxHand=-99;
  for(let i=0;i<fps*9;i++){
   const t=i/fps;d.waterDepth=t<.5?0:t<7?1:0;d.aimActive=t>2&&t<6;d.turnRate=t>5&&t<5.5?4:0;d.travelAngle=t>5?-.6:0;d.reloadPhase=1;d.boomerangAway=hero==='lingya'&&t>4&&t<5;
   if(t>3&&t<4){d.shotSerial=1;d.reloadDuration=.8;d.reloadPhase=Math.min(1,(t-3)/.8);}else d.shotSerial=0;
   animateActor(g.hero,t,t>1&&t<6?3:0,0,0);g.hero.updateMatrixWorld(true);
   if(previous&&t>.5){maxBody=Math.max(maxBody,d.rig.quaternion.angleTo(previous.body));joints.forEach((j,k)=>maxJoint=Math.max(maxJoint,j.quaternion.angleTo(previous.joints[k])));}
   previous={body:d.rig.quaternion.clone(),joints:joints.map(j=>j.quaternion.clone())};
   if(t>2.1&&t<2.95){check(d.swimAim<.01,'aim freezes paddle '+hero);const hand=d.support.hand.getWorldPosition(d.support.target);minHand=Math.min(minHand,hand.z);maxHand=Math.max(maxHand,hand.z);}
   check(Number.isFinite(d.rig.position.y)&&Math.abs(d.rig.position.y)<1.5,'invalid root '+hero);for(const j of joints)check(Number.isFinite(j.quaternion.w),'invalid joint');
  }
  check(maxJoint<14.1/fps,'joint snap '+hero+' '+fps+' '+maxJoint);check(maxBody<8/fps,'body snap '+hero+' '+fps+' '+maxBody);check(d.waterBlend===0,'shore pose persists');check(maxHand-minHand>.025,'no paddling while aiming '+hero);
  rows.push({hero,fps,maxJoint,maxBody,paddle:maxHand-minHand});
 }
 for(const hero of ['guardian','tide','lingya']){
  g.select(hero,'forest',0);g.start();g.world.obstacles=[];g.world.sites=[];const pond=g.world.ponds[0];g.world.patches=[pond];g.player.x=pond.x;g.player.z=pond.z;g.player.inv=999;g.hero.rotation.y=0;g.controls.hasAim=true;g.controls.angle=0;g.controls.held=false;g.player.attack=999;g.camera.position.set(pond.x+10,18,pond.z+14);g.camera.lookAt(pond.x,0,pond.z);g.camera.updateMatrixWorld(true);
  const step=n=>{for(let i=0;i<n;i++)g.step(1/60)};step(90);const e=g.spawn('golem',pond.x,pond.z+2.3);check(e,'missing target');e.hp=e.maxHp=100000;e.speed=0;e.cool=999;g.player.attack=0;g.controls.held=true;step(100);g.controls.held=false;check(e.hp<e.maxHp,'cannot hit in water '+hero);
  g.dash();step(130);check(g.hero.visible,'hidden after water ability '+hero);check(g.player.dashTime===0,'ability stuck');g.pause();const t=g.time,y=g.hero.userData.rig.position.y;g.step(1);check(g.time===t&&g.hero.userData.rig.position.y===y,'pause drift');g.resume();
 }
 return rows;
 },width);assert.deepEqual(errors,[]);console.log('PASS '+width+'x'+height+' distinct swimming, aim/attack transitions, joint continuity, shoreline, real hits and abilities '+JSON.stringify(rows));
 if(process.env.OUTPUT_DIR&&width===1440){
  await p.addStyleTag({content:'body > :not(canvas){visibility:hidden!important}'});
  for(const hero of ['guardian','tide','lingya'])for(const phase of [0,.3,.65]){
   await p.evaluate(async({hero,phase})=>{const {animateActor}=await import('./world.js?v=70'),g=game3d;g.select(hero,'forest',0);g.start();const pond=g.world.ponds[0];g.hero.position.set(pond.x,0,pond.z);g.hero.rotation.y=0;const d=g.hero.userData;d.waterDepth=1;d.aimActive=true;for(let i=0;i<120;i++)animateActor(g.hero,i/60,3,0,0);const frames=Math.round(((phase-d.swimPhase+1)%1)/d.swimPace*60);for(let i=1;i<=frames;i++)animateActor(g.hero,(119+i)/60,3,0,0);g.camera.position.set(pond.x+5,4,pond.z+6);g.camera.lookAt(pond.x,.65,pond.z);g.camera.updateMatrixWorld(true);g.hero.updateMatrixWorld(true);g.hero.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update()});g.renderer.render(g.vfx.scene,g.camera);},{hero,phase});
   await p.screenshot({path:process.env.OUTPUT_DIR+'/swim-v68-'+hero+'-'+phase+'.png'});
  }
 }await p.close();
}
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});

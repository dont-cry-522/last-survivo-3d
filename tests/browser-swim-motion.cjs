const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const p=await b.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=cb=>{window.nextFrame=cb;return raf(t=>{if(!window.freezeGame)cb(t)})}});
 await p.goto(process.env.TEST_URL||'http://127.0.0.1:8899/');await p.waitForFunction(()=>window.game3d,null,{polling:100,timeout:60000});await p.locator('#start').click();await p.evaluate(()=>freezeGame=true);await p.waitForTimeout(80);
 const report=await p.evaluate(async()=>{
  const {animateActor}=await import('./world.js?v=41'),g=game3d,rows=[];
  for(const hero of ['silver','scout','wraith'])for(const fps of [30,60,120]){
   g.select(hero,'forest',hero==='wraith'?2:0);g.start();const d=g.hero.userData;d.waterDepth=1;
   let maxRig=0,maxArm=0,maxPhase=0,armTime=0,rigTime=0,previous=null;const arm=d.offArm||d.rightArm;
   for(let i=0;i<fps*6;i++){
    const t=i/fps;d.aimActive=t>2&&t<3;d.waterDash=t>3.5&&t<3.8;d.turnRate=t>4&&t<4.3?5:0;d.waterDepth=t>5?0:1;
    animateActor(g.hero,t,t>1&&t<4.5?3:0,0,0);g.hero.updateMatrixWorld(true);
    if(previous){const phase=((d.swimPhase-previous.phase)+1)%1;maxPhase=Math.max(maxPhase,phase);if(t>.6){const rigDelta=d.rig.quaternion.angleTo(previous.rig),armDelta=arm.quaternion.angleTo(previous.arm);if(rigDelta>maxRig){maxRig=rigDelta;rigTime=t;}if(armDelta>maxArm){maxArm=armDelta;armTime=t;}}}
    previous={rig:d.rig.quaternion.clone(),arm:arm.quaternion.clone(),phase:d.swimPhase};
    if(!Number.isFinite(arm.quaternion.w)||!Number.isFinite(d.rig.position.y))throw Error('non-finite pose');
   }
   rows.push({hero,fps,maxRig,maxArm,maxPhase,armTime,rigTime,exited:d.waterBlend<.001});
  }return rows;
 });
 for(const r of report){assert(r.maxPhase<1.25/r.fps,'stroke phase jumps at dash/pause '+JSON.stringify(r));assert(r.maxRig<.20,'body snaps '+JSON.stringify(r));assert(r.maxArm<8.1/r.fps,'arm snaps '+JSON.stringify(r));assert(r.exited,'water pose persists on shore');}
 console.log('PASS swim phase, arm/body continuity through move, aim, dash, turn and shore at 30/60/120 FPS',report);assert.deepEqual(errors,[]);
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});

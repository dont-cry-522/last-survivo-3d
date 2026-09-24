const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:8897/');await page.waitForFunction(()=>window.game3d);
 const results=await page.evaluate(async()=>{
  const {createSkinnedHero,animateSkinnedHero,disposeHero}=await import('./skinned-hero.js?v=24');
  const out=[];
  const T=await import('./vendor/three.module.js');
  for(const fps of [30,60,120])for(const [kind,weapon]of [['scout','shotgun'],['silver','shuriken'],['silver','crossbow'],['scout','fire']]){
   const h=createSkinnedHero(kind,weapon),d=h.userData;d.aimActive=true;let tail=0,maxJump=0,previous=0;
   for(let f=0;f<=fps;f++){
    const t=f/fps;d.reloadPhase=Math.min(1,t/.6);animateSkinnedHero(h,t,0,Math.max(0,.16-t),0);
    if(t>.16&&t<.24)tail=Math.max(tail,Math.abs(d.rig.rotation.x));maxJump=Math.max(maxJump,Math.abs(d.rig.rotation.x-previous));previous=d.rig.rotation.x;
    h.updateMatrixWorld(true);h.traverse(o=>{if(!o.matrixWorld.elements.every(Number.isFinite))throw Error('invalid transform');});
   }
   let gripError=0;
   if(weapon==='shotgun'){const hand=d.model.skeleton.bones.find(b=>b.name==='hand_l');gripError=hand.getWorldPosition(new T.Vector3()).distanceTo(d.gun.localToWorld(new T.Vector3(0,.015,.34)));}
   const rest=Math.abs(d.rig.rotation.x);
   if(weapon==='shotgun')for(let f=0;f<fps*2;f++){
    h.rotation.y=Math.sin(f/fps)*.8;d.aimAngle=h.rotation.y;d.travelAngle=h.rotation.y+.4;d.reloadPhase=(f/fps%.6)/.6;
    animateSkinnedHero(h,(d.lastTime||0)+1/fps,f<fps?5.5:0,Math.max(0,.16-f/fps%.6),0);h.updateMatrixWorld(true);
    gripError=Math.max(gripError,d.support.hand.getWorldPosition(new T.Vector3()).distanceTo(d.gun.localToWorld(new T.Vector3(0,.015,.34+(d.gun.userData.pump?.position.z||0)))));
   }
   out.push({weapon,fps,tail,maxJump,rest,gripError});disposeHero(h);
  }return out;
 });
 for(const r of results){assert(r.tail>.003,'attack abruptly lost recovery '+JSON.stringify(r));assert(r.rest<.001);assert(r.gripError<.12,'support hand misses weapon '+JSON.stringify(r));assert(r.maxJump<.085);}
 assert.deepEqual(errors,[]);console.log('PASS smooth attack recovery for four weapon types at 30/60/120 FPS');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});

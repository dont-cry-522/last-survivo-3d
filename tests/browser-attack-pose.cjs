const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const page=await browser.newPage();await page.goto(process.env.TEST_URL||'http://127.0.0.1:8897/');await page.waitForFunction(()=>window.game3d,{},{timeout:60000});
  const result=await page.evaluate(async()=>{
   const T=await import('./vendor/three.module.js'),{createSkinnedHero,animateSkinnedHero}=await import('./skinned-hero.js?v=23');
   const hero=createSkinnedHero('silver','crossbow'),d=hero.userData;d.aimActive=true;d.aimAngle=0;
   let hand,offHand;hero.traverse(o=>{if(o.isBone&&o.name==='hand_r')hand=o;if(o.isBone&&o.name==='hand_l')offHand=o;});let t=0;
   for(let i=0;i<50;i++){t+=1/60;animateSkinnedHero(hero,t,0,.1,0);}
   hero.updateMatrixWorld(true);let prev=hand.getWorldPosition(new T.Vector3()),maxJump=0;
   for(let i=0;i<140;i++){d.reloadPhase=(i%30)/29;t+=1/60;animateSkinnedHero(hero,t,0,.1,0);hero.updateMatrixWorld(true);const next=hand.getWorldPosition(new T.Vector3());maxJump=Math.max(maxJump,next.distanceTo(prev));prev=next;}
   d.reloadPhase=1;d.aimAngle=Math.PI;let previousYaw=d.gun.getWorldQuaternion(new T.Quaternion()),previousTurnGrip=hand.getWorldPosition(new T.Vector3()),maxTurn=0,maxTurnGrip=0;
   for(let i=0;i<17;i++){hero.rotation.y=Math.min(Math.PI,(i+1)*.2);t+=1/60;animateSkinnedHero(hero,t,0,.1,0);hero.updateMatrixWorld(true);const nextYaw=d.gun.getWorldQuaternion(new T.Quaternion()),nextTurnGrip=hand.getWorldPosition(new T.Vector3());maxTurn=Math.max(maxTurn,nextYaw.angleTo(previousYaw));maxTurnGrip=Math.max(maxTurnGrip,nextTurnGrip.distanceTo(previousTurnGrip));previousYaw=nextYaw;previousTurnGrip=nextTurnGrip;}
   d.travelAngle=Math.PI+.35;let previousGrip=hand.getWorldPosition(new T.Vector3()),maxMovingJump=0;
   for(let i=0;i<120;i++){d.reloadPhase=(i%30)/29;t+=1/60;animateSkinnedHero(hero,t,5.5,.1,0);hero.updateMatrixWorld(true);const nextGrip=hand.getWorldPosition(new T.Vector3());maxMovingJump=Math.max(maxMovingJump,nextGrip.distanceTo(previousGrip));previousGrip=nextGrip;}
   d.aimActive=false;d.reloadPhase=1;let previousOff=offHand.getWorldPosition(new T.Vector3()),maxReleaseOff=0;
   for(let i=0;i<75;i++){t+=1/60;animateSkinnedHero(hero,t,0,0,0);hero.updateMatrixWorld(true);const nextOff=offHand.getWorldPosition(new T.Vector3());maxReleaseOff=Math.max(maxReleaseOff,nextOff.distanceTo(previousOff));previousOff=nextOff;}
   return {maxJump,maxTurn,maxTurnGrip,maxMovingJump,maxReleaseOff};
  });
  assert(result.maxJump<.12,`crossbow grip jumps ${result.maxJump.toFixed(3)} m within one stationary attack frame`);
  assert(result.maxTurn<.5,`crossbow flips ${result.maxTurn.toFixed(3)} rad while the body turns gradually`);
  assert(result.maxTurnGrip<.16,`crossbow grip jumps ${result.maxTurnGrip.toFixed(3)} m when changing aim`);
  assert(result.maxMovingJump<.16,`moving crossbow grip jumps ${result.maxMovingJump.toFixed(3)} m within one attack frame`);
  assert(result.maxReleaseOff<.18,`off hand snaps ${result.maxReleaseOff.toFixed(3)} m when lowering the crossbow`);
  console.log('PASS steady crossbow grip and smooth turns:',JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

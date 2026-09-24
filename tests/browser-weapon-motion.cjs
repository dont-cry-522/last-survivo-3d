const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:8897/');await page.waitForFunction(()=>window.game3d);
  const motions=await page.evaluate(async()=>{
   const {createSkinnedHero,animateSkinnedHero,disposeHero}=await import('./skinned-hero.js?v=23'),result={};
   for(const [kind,weapon] of [['scout','rifle'],['scout','shotgun'],['scout','fire'],['silver','shuriken'],['silver','dark']]){
    const hero=createSkinnedHero(kind,weapon),d=hero.userData,reference=createSkinnedHero(kind,weapon),rest=reference.userData;d.aimActive=rest.aimActive=true;
    for(let i=0;i<90;i++){animateSkinnedHero(hero,(d.lastTime||0)+1/60,0,0,0);animateSkinnedHero(reference,(rest.lastTime||0)+1/60,0,0,0);}
    d.reloadPhase=.35;const peak=[0,0,0,0];
    // Sample the release and follow-through, rather than just the wind-up frame.
    for(let f=0;f<10;f++){
     animateSkinnedHero(hero,d.lastTime+1/60,0,Math.max(0,.16-f/60),0);animateSkinnedHero(reference,rest.lastTime+1/60,0,0,0);
     [d.aimArm,d.firingForearm,d.offArm,d.offForearm].forEach((bone,i)=>peak[i]=Math.max(peak[i],bone.quaternion.angleTo([rest.aimArm,rest.firingForearm,rest.offArm,rest.offForearm][i].quaternion)));
    }
    result[weapon]={arms:peak,pump:d.gun.userData.pump?.position.z||0};
    d.reloadPhase=1;for(let i=0;i<40;i++){animateSkinnedHero(hero,d.lastTime+1/60,0,0,0);animateSkinnedHero(reference,rest.lastTime+1/60,0,0,0);}
    result[weapon].recovery=[d.aimArm,d.firingForearm,d.offArm,d.offForearm].map((bone,i)=>bone.quaternion.angleTo([rest.aimArm,rest.firingForearm,rest.offArm,rest.offForearm][i].quaternion));
    disposeHero(hero);disposeHero(reference);
   }
   return result;
  });
  for(const weapon of ['rifle','shotgun','fire','shuriken','dark'])assert(motions[weapon].arms.some(angle=>angle>.07),`${weapon} lacks a visible arm attack motion`);
  for(const weapon of ['rifle','shotgun','fire','shuriken','dark'])assert(motions[weapon].recovery.every(angle=>angle<.05),`${weapon} arm did not return after firing: ${JSON.stringify(motions[weapon].recovery)}`);
  assert(Math.abs(motions.shotgun.pump)>.04,'shotgun pump does not cycle');
  const fired=await page.evaluate(()=>{const g=game3d,out={};for(const [kind,index,weapon] of [['scout',0,'rifle'],['scout',1,'shotgun'],['scout',2,'fire'],['silver',0,'crossbow'],['silver',1,'shuriken'],['silver',2,'dark']]){g.select(kind,'forest',index);g.start();g.controls.hasAim=true;g.controls.angle=g.hero.rotation.y;g.controls.held=true;for(let i=0;i<8;i++)g.step(1/60);out[weapon]={cooldown:g.player.attack,pose:g.hero.userData.shoot,skinned:g.hero.userData.skinned};g.controls.held=false;}return out;});
  for(const [weapon,signal] of Object.entries(fired))assert(signal.skinned&&signal.cooldown>0&&signal.pose>0,`${weapon} did not animate when fired in game`);
  assert.deepEqual(errors,[]);console.log('PASS distinct attack motions for rifle, shotgun, fire staff, shuriken, dark staff');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});

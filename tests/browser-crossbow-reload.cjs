const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const page=await browser.newPage();
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:8897/');await page.waitForFunction(()=>window.game3d);
  const poses=await page.evaluate(async()=>{
   const {loadHeroAssets,createSkinnedHero,animateSkinnedHero,disposeHero}=await import('./skinned-hero.js?v=24');
   await loadHeroAssets();const {Vector3}=await import('./vendor/three.module.js'),hero=createSkinnedHero('silver','crossbow'),d=hero.userData;
   let hand,rightHand;hero.traverse(o=>{if(o.isBone&&o.name==='hand_l')hand=o;if(o.isBone&&o.name==='hand_r')rightHand=o;});
   d.aimActive=true;d.reloadPhase=1;for(let i=0;i<30;i++)animateSkinnedHero(hero,(d.lastTime||0)+1/60,0,0,0);
   const sample=phase=>{d.reloadPhase=phase;animateSkinnedHero(hero,(d.lastTime||0)+1/60,0,0,0);hero.updateMatrixWorld(true);return {hand:hand.getWorldPosition(new Vector3()).toArray(),rightHand:rightHand.getWorldPosition(new Vector3()).toArray(),pull:d.gun.userData.stringPull||0};};
   const rest=sample(1),draw=sample(.5),returnPose=sample(1);disposeHero(hero);return {rest,draw,returnPose};
  });
  const distance=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]));
  assert(poses.draw.pull>.15,'bowstring should visibly draw back');
  assert(poses.rest.rightHand[1]>1.30,'crossbow should be held at chest height while aiming');
  assert(distance(poses.rest.hand,poses.draw.hand)>.06,'off hand should pull the string');
  assert(poses.returnPose.pull<.01,'string should return after release');
  console.log('PASS crossbow off-hand draw and string reset');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

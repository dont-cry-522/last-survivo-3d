const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
const p=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.TEST_URL||'http://127.0.0.1:8899/');await p.waitForFunction(()=>window.game3d&&!document.querySelector('#start').disabled,null,{timeout:60000});
const result=await p.evaluate(async()=>{
 const T=await import('./vendor/three.module.js'),{createSkinnedHero,animateSkinnedHero,disposeHero}=await import('./skinned-hero.js?v=52'),{animateActor}=await import('./world.js?v=52');const check=(c,s)=>{if(!c)throw Error(s)},point=o=>o.getWorldPosition(new T.Vector3());let largestJump=0,measurements,materialNames=[];
 const ranger=createSkinnedHero('scout','rifle'),warden=createSkinnedHero('guardian','hammer');
 const body=g=>{let b;g.traverse(o=>{if(o.name==='Male_Ranger_Body')b=o});return b;};
 check(warden.getObjectByName('Guardian_hair')&&warden.getObjectByName('Guardian_beard'),'guardian facial identity missing');
 check(!ranger.getObjectByName('Guardian_beard'),'guardian changed the ranger');
 const rb=body(ranger),wb=body(warden);check(rb.geometry!==wb.geometry&&rb.material!==wb.material,'guardian mutates shared ranger asset');
 rb.geometry.computeBoundingBox();wb.geometry.computeBoundingBox();check(wb.geometry.boundingBox.max.x>rb.geometry.boundingBox.max.x*1.1,'guardian silhouette not broader');
 check(rb.material.metalness!==wb.material.metalness,'armor material unchanged');disposeHero(ranger);disposeHero(warden);
 for(const fps of[30,60,120])for(const duration of[.48,.77])for(let combo=0;combo<3;combo++){
  const g=createSkinnedHero('guardian','hammer'),d=g.userData;let skin=0;g.traverse(o=>{if(o.isSkinnedMesh){skin++;if(fps===30&&duration===.48&&combo===0)materialNames.push(o.material.name)}});check(skin>3,'missing continuous skinned body');
  for(let i=0;i<60;i++)animateSkinnedHero(g,i/60,0,0,0);
  d.shotSerial=1;d.meleeCombo=combo;let previous=null;const joints=[d.offArm,d.offForearm,d.aimArm,d.firingForearm,d.support.hand,d.support.rightHand],grips=[d.hammer.position.clone(),d.shield.position.clone()];
  for(let i=0;i<fps*2;i++){d.reloadPhase=Math.min(1,i/fps/duration);d.travelAngle=.5;animateSkinnedHero(g,1+i/fps,3,0,0);g.updateMatrixWorld(true);g.traverse(o=>check(o.matrixWorld.elements.every(Number.isFinite),'NaN model'));const q=joints.map(j=>j.quaternion.clone());if(previous)for(let j=0;j<q.length;j++){const jump=q[j].angleTo(previous[j]);largestJump=Math.max(largestJump,jump);check(jump<.67,`joint snap ${fps} ${combo} ${jump}`);}previous=q;}
  check(d.hammer.parent===d.support.rightHand&&d.shield.parent===d.support.hand,'detached weapons');check(d.hammer.position.equals(grips[0])&&d.shield.position.equals(grips[1]),'grip drift');
  if(fps===60&&duration===.77&&combo===0){let t=4;const pose=(c,u)=>{d.meleeCombo=c;d.reloadPhase=u;for(let i=0;i<30;i++)animateSkinnedHero(g,t+=1/60,0,0,0);g.updateMatrixWorld(true);return{shield:point(d.shieldContact),hammer:point(d.hammerContact)}};const rest=pose(0,1),strike=pose(0,.43),high=pose(2,.3),low=pose(2,.52);measurements={shieldExtension:strike.shield.z-rest.shield.z,hammerDrop:high.hammer.y-low.hammer.y};check(measurements.shieldExtension>.20,'shield did not thrust');check(measurements.hammerDrop>.85,'hammer did not descend');
   pose(2,.3);d.cancelAttack=true;d.reloadPhase=1;d.dashTime=.38;for(let i=0;i<30;i++)animateSkinnedHero(g,t+=1/60,2,0,0);check(d.cancelPose===null,'cancel did not recover');d.dashTime=0;
   d.waterDepth=1;for(let i=0;i<180;i++)animateActor(g,t+=1/60,2);check(d.waterBlend>.95&&d.waterPose.length>0,'no swimming');d.waterDepth=0;for(let i=0;i<240;i++)animateActor(g,t+=1/60,0);g.updateMatrixWorld(true);check(d.waterBlend<.01&&Math.abs(d.rig.position.y)<.02,'water offsets accumulated');g.traverse(o=>check(o.matrixWorld.elements.every(Number.isFinite),'NaN after swimming'));
  }
  disposeHero(g);
 }
 for(const[kind,weapons]of Object.entries({scout:['rifle','shotgun','fire'],silver:['crossbow','shuriken','dark']}))for(const w of weapons){const g=createSkinnedHero(kind,w);for(let i=0;i<120;i++){g.userData.reloadPhase=(i%45)/45;animateSkinnedHero(g,i/60,4,i%45<10?.15:0,0);}g.updateMatrixWorld(true);g.traverse(o=>check(o.matrixWorld.elements.every(Number.isFinite),kind+' weapon regression'));disposeHero(g);}
 return{largestJump,measurements,materialNames};
});assert.deepEqual(errors,[]);console.log('PASS skeletal guardian grips, smooth haste attacks, contact trajectories, cancellation, water recovery, six original weapons',JSON.stringify(result));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});

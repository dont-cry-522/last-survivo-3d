const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),headless:true});
  try{
    const page=await browser.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.TEST_URL||'http://127.0.0.1:8897/');
    await page.waitForFunction(()=>window.game3d,{},{timeout:60000});
    assert(await page.locator('#start').isEnabled());
    const result=await page.evaluate(async()=>{
      const T=await import('./vendor/three.module.js');
      const {createSkinnedHero,animateSkinnedHero,disposeHero}=await import('./skinned-hero.js?v=9');
      const out=[];
      for(const [kind,weapons] of [['silver',['crossbow','shuriken','dark']],['scout',['rifle','shotgun','fire']]])for(const weapon of weapons){
        const hero=createSkinnedHero(kind,weapon),d=hero.userData;
        for(const speed of [0,5.5])for(const rotation of [0,.9]){
          hero.rotation.y=rotation;
          for(let frame=0;frame<90;frame++)animateSkinnedHero(hero,(d.lastTime||0)+1/60,speed,1,0);
          hero.updateMatrixWorld(true);
          if(!['fire','dark'].includes(weapon)){
            const barrel=new T.Vector3(0,0,1).applyQuaternion(d.gun.getWorldQuaternion(new T.Quaternion()));
            const target=new T.Vector3(0,0,1).applyQuaternion(hero.getWorldQuaternion(new T.Quaternion()));
            if(barrel.dot(target)<.999)throw Error(`${kind}/${weapon}: aim deviated while speed=${speed}, rotation=${rotation}`);
          }
          hero.traverse(o=>{if(!o.matrixWorld.elements.every(Number.isFinite))throw Error('Invalid animated transform');});
        }
        if(kind==='scout'){
          d.dashTime=.12;animateSkinnedHero(hero,d.lastTime+1/60,5.5,1,0);
          if([d.idle,d.run,d.upperIdle,d.upperRun,d.aim].some(a=>a.getEffectiveWeight()!==0))throw Error('Locomotion leaking into roll');
          d.dashTime=0;animateSkinnedHero(hero,d.lastTime+1/60,5.5,1,0);
          if(!d.run.getEffectiveWeight()||!d.aim.getEffectiveWeight())throw Error('Animation failed to resume after roll');
          for(let frame=0;frame<180;frame++){animateSkinnedHero(hero,d.lastTime+1/60,0,1,0);if(Math.abs(d.aimArm.quaternion.length()-1)>.00001)throw Error('Firing arm rotation drifting after roll');}
        }
        const other=createSkinnedHero(kind,weapon);
        if(other.userData.model.skeleton===d.model.skeleton)throw Error('Heroes share mutable skeleton');
        disposeHero(hero);animateSkinnedHero(other,1,5.5,1,0);disposeHero(other);
        out.push(kind+'/'+weapon);
      }
      return out;
    });
    assert.deepEqual(errors,[]);
    console.log('PASS loaded skinned assets, 6 weapons, moving/stationary/rotated aim, roll recovery, independent skeletons:',result.join(', '));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

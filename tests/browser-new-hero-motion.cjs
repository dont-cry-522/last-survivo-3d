const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.TEST_URL||'http://127.0.0.1:8899/');await p.waitForFunction(()=>window.game3d&&!document.querySelector('#start').disabled,null,{polling:200,timeout:60000});const result=await p.evaluate(async()=>{
 const T=await import('./vendor/three.module.js'),{createSkinnedHero,animateSkinnedHero,disposeHero}=await import('./skinned-hero.js?v=76'),check=(v,m)=>{if(!v)throw Error(m)},report={};
 for(const[kind,weapon]of[['guardian','hammer'],['tide','harpoon'],['lingya','boomerang']])for(const fps of[15,30,60,120]){
  const g=createSkinnedHero(kind,weapon),d=g.userData;let last=null,jump=0,t=0;
  for(let i=0;i<fps*8;i++){t=i/fps;const stage=Math.floor(t),active=stage>=2&&stage<=5,age=(t-2)% .65;d.aimActive=active;d.reloadDuration=.65;d.reloadPhase=active?age/.65:1;d.shotSerial=active?1+Math.floor((t-2)/.65):d.shotSerial;d.meleeCombo=active?Math.floor((t-2)/.65)%3:0;d.harpoonCombo=d.meleeCombo;d.boomerangAway=active&&age>.132;d.travelAngle=stage>=4?Math.sin(t*2)*2.2:0;d.aimAngle=g.rotation.y=0;
   const speed=stage===1||stage===4||stage===5?5:0;animateSkinnedHero(g,t,speed,0,0);g.updateMatrixWorld(true);g.traverse(o=>check(o.matrixWorld.elements.every(Number.isFinite),kind+' nonfinite pose'));
   const joints=[d.aimArm,d.firingForearm,d.offArm,d.offForearm].map(q=>q.quaternion.clone());if(last&&fps===60)for(let j=0;j<4;j++)jump=Math.max(jump,last[j].angleTo(joints[j]));last=joints;
   if(stage===3&&age>.12&&age<.30)check(Object.values(d.kineticActions).some(a=>a.getEffectiveWeight()>0)||age>.58||age<.03,'no planted attack');
   if(stage===5&&i%fps===fps-1)check(Object.values(d.kineticActions).every(a=>a.getEffectiveWeight()===0),'attack overwrote running legs');
  }
  check(d.readyBlend<.001&&d.blend<.001,'ready/walk pose stuck');check(Math.abs(d.rig.position.y)<.02,'body height did not recover');check(Object.values(d.kineticActions).every(a=>a.getEffectiveWeight()===0),'attack legs stuck');if(fps===60){check(jump<.35,kind+' arm snapped '+jump);report[kind]={maxArmStep:jump};}disposeHero(g);
 }
 return report;});assert.deepEqual(errors,[]);console.log('PASS four frame rates: idle/run/reversal, planted attacks, moving attacks, haste, recovery',result);}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});

const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'../../mobile-check/node_modules/playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.TEST_URL||'http://127.0.0.1:8897/');await p.waitForFunction(()=>!!window.game3d,null,{polling:100,timeout:90000});
 const rows=await p.evaluate(async()=>{
  const T=await import('./vendor/three.module.js'),{createSkinnedHero,animateSkinnedHero,disposeHero}=await import('./skinned-hero.js?v=88'),{makeWraith,animateWraith}=await import('./wraith-model.js?v=88'),{GRIP_POINTS}=await import('./weapon-grips.js?v=88');
  const check=(v,m)=>{if(!v)throw Error(m)},rows=[];
  for(const [kind,id]of [['scout','rifle'],['scout','shotgun'],['scout','fire'],['silver','crossbow'],['silver','shuriken'],['silver','dark'],['tide','harpoon'],['lingya','boomerang'],['wraith','shade'],['wraith','shadowblade'],['wraith','grimoire']]){
   const hero=kind==='wraith'?makeWraith(id):createSkinnedHero(kind,id),d=hero.userData,animate=kind==='wraith'?animateWraith:animateSkinnedHero;let error=0,step=0,supportError=0,peakAt=0,last;
   for(let i=0;i<360;i++){
    const t=i/60,cycle=(t-1)%1;d.aimActive=t>1&&t<4;d.aimAngle=Math.sin(t)*.45;d.travelAngle=.3;d.reloadDuration=1;d.reloadPhase=t>1&&t<4?cycle:1;d.shotSerial=t>1?Math.floor(t):0;d.boomerangAway=id==='boomerang'&&t>2.1&&t<2.8;d.catchReady=d.boomerangAway&&t>2.6?(t-2.6)/.2:0;d.dashTime=t>4.5?Math.max(0,({tide:2,lingya:.58,scout:.58}[kind]||.24)-(t-4.5)):0;
    animate(hero,t,t>2&&t<5?5:0,cycle<1/60&&t>1&&t<4?.2:0,0);hero.updateMatrixWorld(true);
    hero.traverse(o=>{check(o.matrixWorld.elements.every(Number.isFinite),kind+' non-finite transform')});
    if(d.skinned){
     const grip=d.gun.localToWorld(new T.Vector3(...GRIP_POINTS[id])),palm=d.support.rightHand.localToWorld(new T.Vector3(-.036,.097,0));error=Math.max(error,grip.distanceTo(palm));
     const q=d.support.rightHand.getWorldQuaternion(new T.Quaternion()).normalize();if(last&&t<4.5&&last.angleTo(q)>step){step=last.angleTo(q);peakAt=t;}last=q;
     if(['rifle','shotgun','crossbow','harpoon'].includes(id)&&t>3.8&&t<4){const contact=d.gun.worldToLocal(d.support.hand.localToWorld(new T.Vector3(.036,.097,0)));supportError=Math.max(supportError,Math.hypot(contact.x,contact.y-(id==='harpoon'?0:id==='crossbow'?-.035:-.025)));check(contact.z>-.08&&contact.z<.50,id+' supporting outside handle');}
     if(id==='boomerang')check(d.gun.visible!==d.boomerangAway,'boomerang left in palm after release');
    }else if(id==='shadowblade'){
     error=Math.max(error,d.weapon.localToWorld(new T.Vector3(0,-.035,.02)).distanceTo(d.rightHand.localToWorld(new T.Vector3(0,-.105,.056))));
    }
   }
   check(error<.001,id+' slips out of palm: '+error);check(step<.8,id+' wrist snaps: '+step);check(supportError<.045,id+' palm misses the supporting handle: '+supportError);
   rows.push({kind,id,palmError:error,maxWristStep:step,peakAt,supportError});if(d.skinned)disposeHero(hero);
  }return rows;
 });assert.deepEqual(errors,[]);console.log(JSON.stringify(rows,null,2));console.log('PASS eleven loadouts: palm contact, support grips, wrist continuity, release and finite motion');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});

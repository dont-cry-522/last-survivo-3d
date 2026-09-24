const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 for(const viewport of [{width:1280,height:800},{width:844,height:390},{width:390,height:844}]){
 const p=await b.newPage({viewport,hasTouch:viewport.width<1000});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=cb=>raf(t=>{if(!window.freezeGame)cb(t);});});
 await p.goto(process.env.TEST_URL||'http://127.0.0.1:8897/');await p.waitForFunction(()=>window.game3d);await p.evaluate(()=>window.freezeGame=true);await p.waitForTimeout(40);
 const results=[];
 for(const held of [false,true])for(const dt of [1/60,1/30,.04]){
  await p.evaluate(()=>{const g=game3d;g.select('scout','forest',0);g.start();g.world.obstacles.length=0;g.world.patches.length=0;g.hero.rotation.y=Math.PI/4;g.controls.held=false;g.controls.hasAim=false;});
  if(held)await p.keyboard.down('w');
  results.push(await p.evaluate(({dt,held})=>{const g=game3d,x=g.player.x,z=g.player.z;g.dash();const duration=g.player.dashTime,clip=g.hero.userData.actions.Roll.getClip().name;const movement=[];let flipped=false,oldX=x,oldZ=z;while(g.player.dashTime>0){g.step(dt);const d=g.hero.userData,head=d.model.skeleton.bones.find(b=>b.name==='Head');flipped ||= head.getWorldPosition(g.hero.position.clone()).y<d.pelvis.getWorldPosition(g.hero.position.clone()).y-.05;movement.push(Math.hypot(g.player.x-oldX,g.player.z-oldZ));oldX=g.player.x;oldZ=g.player.z;}
   const distance=Math.hypot(g.player.x-x,g.player.z-z),height=g.hero.position.y;g.controls.held=true;g.controls.hasAim=true;g.controls.angle=g.hero.rotation.y;for(let i=0;i<12;i++)g.step(1/60);
   return{dt,held,duration,clip,flipped,distance,height,movement,resumed:g.player.attack>0,inv:g.player.inv};},{dt,held}));
  if(held)await p.keyboard.up('w');
 }
 for(const r of results){assert.equal(r.clip,'Roll','roll action incorrectly aliases another clip');assert(r.flipped,'body never actually rolls over');assert(r.duration>=.45&&r.duration<=.7,'roll is squeezed into too few frames');assert(Math.abs(r.distance-4.8)<.01,JSON.stringify(r));assert.equal(r.height,0);assert(r.resumed);assert.equal(r.inv,0);assert(r.movement[0]<Math.max(...r.movement)*.3);}
 const blocked=await p.evaluate(()=>{const g=game3d;g.start();g.world.obstacles.length=0;g.world.patches.length=0;const x=g.player.x,z=g.player.z;g.world.obstacles.push({x,z:z+2,r:1});g.hero.rotation.y=0;g.dash();g.step(.1);g.pause();const before=[g.player.z,g.player.dashTime];g.step(.1);const frozen=before[0]===g.player.z&&before[1]===g.player.dashTime;g.resume();while(g.player.dashTime>0)g.step(1/60);return{frozen,travel:g.player.z-z};});
 assert(blocked.frozen);assert(blocked.travel<1.2,'roll passes through a tree');
 assert.deepEqual(errors,[]);console.log('PASS actual roll, travel, pause, collision and recovery '+viewport.width+'x'+viewport.height);await p.close();
 }
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});


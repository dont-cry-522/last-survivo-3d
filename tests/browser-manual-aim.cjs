const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const url=process.env.TEST_URL||'http://127.0.0.1:8897/';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  for(const viewport of [{width:1280,height:800,touch:false},{width:844,height:390,touch:true},{width:390,height:844,touch:true}]){
   const page=await browser.newPage({viewport,hasTouch:viewport.touch}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=cb=>raf(t=>{if(!window.freezeGame)cb(t);});});
   await page.goto(url);await page.waitForFunction(()=>window.game3d);
   await page.locator('#start').click();await page.evaluate(()=>window.freezeGame=true);
   const idle=await page.evaluate(()=>{
    const g=game3d;g.world.obstacles.length=0;g.world.patches.length=0;
    const e=g.spawn('golem',g.player.x+6,g.player.z);e.hp=e.maxHp=10000;e.speed=0;e.cool=99;
    for(let i=0;i<120;i++)g.step(1/60);
    return {hp:e.hp,max:e.maxHp,bullets:g.bullets.length};
   });
   assert.equal(idle.hp,idle.max,'standing near a monster must not auto-fire');
   assert.equal(idle.bullets,0,'no bullets before pressing attack');
   if(viewport.touch){
    const controls=await Promise.all(['#joystick','#dash','#aim-stick'].map(s=>page.locator(s).boundingBox()));
    const overlap=(a,b)=>Math.min(a.x+a.width,b.x+b.width)>Math.max(a.x,b.x)&&Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y);
    assert(!overlap(controls[0],controls[1])&&!overlap(controls[0],controls[2])&&!overlap(controls[1],controls[2]),'mobile controls must stay separate');
    const r=await page.locator('#aim-stick').boundingBox();
    await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();
    assert.equal(await page.evaluate(()=>game3d.controls.held),true,'holding aim stick center must also fire');
    await page.mouse.up();
    await page.mouse.move(r.x+r.width/2+35,r.y+r.height/2);
    await page.mouse.down();
   }else{
    const point=await page.evaluate(async()=>{
     const {Vector3}=await import('./vendor/three.module.js');
     const p=game3d.player,v=new Vector3(p.x+8,0,p.z).project(game3d.camera);
     return {x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2};
    });
    await page.mouse.move(point.x,point.y);await page.mouse.down();
   }
   const fired=await page.evaluate(()=>{
    const g=game3d;g.player.attack=0;g.step(1/60);
    const b=g.bullets[0];return {count:g.bullets.length,vx:b?.vx||0,vz:b?.vz||0};
   });
   assert(fired.count>0,'holding attack must fire');
   assert(viewport.touch?fired.vx>0&&fired.vz<0&&Math.abs(fired.vx+fired.vz)<fired.vx*.4:fired.vx>0&&Math.abs(fired.vz)<fired.vx*.4,'shot must follow player aim to the right');
   await page.mouse.up();
   const stopped=await page.evaluate(()=>{const g=game3d;for(let i=0;i<100;i++)g.step(1/60);const before=g.bullets.length;g.player.attack=0;g.step(1/60);return {before,after:g.bullets.length};});
   assert.equal(stopped.after,stopped.before,'releasing attack must stop new shots');
   assert((await page.evaluate(()=>game3d.hero.userData.aimBlend))<.1,'upper body should relax after releasing attack');
   if(viewport.touch){
    const left=await page.locator('#joystick').boundingBox(),right=await page.locator('#aim-stick').boundingBox(),cdp=await page.context().newCDPSession(page);
    const a={x:left.x+left.width/2,y:left.y+left.height/2,id:1},b={x:right.x+right.width/2,y:right.y+right.height/2,id:2};
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a,b]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...a,x:a.x+28},{...b,x:b.x+34}]});
    const both=await page.evaluate(()=>{const g=game3d,x=g.player.x,z=g.player.z;g.player.attack=0;g.step(1/60);return {moved:Math.hypot(g.player.x-x,g.player.z-z),held:g.controls.held};});
    assert(both.moved>.01&&both.held,'both mobile sticks must work simultaneously');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.equal(await page.evaluate(()=>game3d.controls.held),false,'lifting fingers must stop mobile fire');
   }
   assert.deepEqual(errors,[]);
   console.log('PASS manual aim/hold/release',viewport.width+'x'+viewport.height);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

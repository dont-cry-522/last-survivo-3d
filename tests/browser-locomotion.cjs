const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
  const b=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  try{
    const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=cb=>raf(t=>{if(!window.freezeGame)cb(t);});});
    await p.goto(process.env.TEST_URL||'http://127.0.0.1:8897/');await p.waitForFunction(()=>window.game3d);
    await p.locator('#start').click();await p.evaluate(()=>{window.freezeGame=true;game3d.start();game3d.world.obstacles.length=0;game3d.world.patches.length=0;});
    await p.waitForTimeout(50);await p.keyboard.down('d');
    const initial=await p.evaluate(()=>{for(let i=0;i<25;i++)game3d.step(1/60);return game3d.hero.rotation.y;});
    const diff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
    assert(Math.abs(diff(initial,Math.PI*.75))<.12,'No-enemy movement must turn the hero toward travel');
    await p.keyboard.up('d');await p.keyboard.down('a');
    const turn=await p.evaluate(()=>{const a=[game3d.hero.rotation.y];for(let i=0;i<30;i++){game3d.step(1/60);a.push(game3d.hero.rotation.y);}return a;});
    assert(turn.slice(1).every((a,i)=>Math.abs(diff(a,turn[i]))<.35),'Direction reversal must not snap');
    assert(Math.abs(diff(turn.at(-1),-Math.PI*.25))<.12,'Turn must settle promptly');
    await p.keyboard.up('a');await p.evaluate(()=>{for(let i=0;i<30;i++)game3d.step(1/60);});
    assert(await p.evaluate(()=>game3d.hero.userData.blend<.04),'Stopping must settle into idle');
    await p.keyboard.down('d');await p.evaluate(()=>{const g=game3d;g.world.obstacles.push({x:g.player.x,z:g.player.z,r:5});for(let i=0;i<30;i++)g.step(1/60);});
    assert(await p.evaluate(()=>game3d.hero.userData.blend<.04),'Blocked movement must not run in place');
    await p.keyboard.up('d');
    const feedback=await p.evaluate(()=>{
      const g=game3d;g.world.obstacles.length=0;const count=()=>g.hero.parent.children.filter(o=>o.geometry?.type==='TorusGeometry').length;
      const before=count(),enemy=g.spawn('mushroom',g.player.x+4,g.player.z);g.hurtEnemy(enemy,1000);const after=count();
      g.hero.rotation.y=1.7;g.player.angle=-1;g.player.dash=0;g.dash();return{before,after,afterDash:count(),dash:g.player.dashAngle};
    });
    assert.equal(feedback.before,feedback.after,'Ordinary defeat must not create a circle');assert.equal(feedback.before,feedback.afterDash,'Teleport must not create ground rings');assert(Math.abs(feedback.dash-1.7)<.001,'No-input dash must follow visible heading');
    for(const kind of ['scout','silver']){
      const circles=await p.evaluate(kind=>{
        const g=game3d;g.select(kind,'forest',2);g.start();g.controls.held=true;g.controls.hasAim=true;g.controls.angle=0;g.world.obstacles.length=0;g.world.patches.length=0;
        const e=g.spawn('golem',g.player.x,g.player.z+4);e.cool=99;e.speed=0;const hp=e.hp;
        const count=()=>g.hero.parent.children.filter(o=>o.geometry?.type==='TorusGeometry').length,before=count();
        for(let i=0;i<30;i++)g.step(1/60);return{before,after:count(),hit:e.hp<hp};
      },kind);
      assert(circles.hit,'Elemental basic attack must still damage enemies');assert.equal(circles.after,circles.before,'Elemental basic hits must not add a circle');
    }
    assert.deepEqual(errors,[]);console.log('PASS movement facing, gradual reversal, idle/blocked movement, dash heading, no ordinary hit/defeat circles');
  }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1);});

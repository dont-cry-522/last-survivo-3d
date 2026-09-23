const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const page=await browser.newPage();await page.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=cb=>raf(t=>{if(!window.freezeGame)cb(t);});});
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:8897/');await page.waitForFunction(()=>window.game3d);await page.locator('#start').click();await page.evaluate(()=>window.freezeGame=true);
  for(const [kind,range,minimum]of [['mushroom',1.7,.7],['wolf',2.7,1]]){
   const advance=await page.evaluate(({kind,range})=>{const g=game3d;g.select('silver','forest',0);g.start();g.world.obstacles.length=0;g.world.patches.length=0;const e=g.spawn(kind,g.player.x,g.player.z+range);e.cool=0;const origin=e.z;for(let i=0;i<42;i++)g.step(1/60);return origin-e.z;},{kind,range});
   assert(advance>minimum,`${kind} should visibly lunge after windup, advanced only ${advance.toFixed(2)} m`);
  }
  const caster=await page.evaluate(()=>{const g=game3d;g.select('silver','forest',0);g.start();g.world.obstacles.length=0;g.world.patches.length=0;const e=g.spawn('shaman',g.player.x,g.player.z+8);e.cool=0;for(let i=0;i<65;i++)g.step(1/60);return g.zones.some(z=>z.kind==='hex');});
  assert(caster,'shaman without wounded allies should cast a visible ranged hex');
  const slam=await page.evaluate(()=>{const g=game3d;g.select('silver','forest',0);g.start();g.world.obstacles.length=0;g.world.patches.length=0;const e=g.spawn('golem',g.player.x,g.player.z+1.8);e.cool=0;for(let i=0;i<65;i++)g.step(1/60);return g.player.hp;});
  assert(slam<120,'golem should damage a player inside its tremor radius');
  const venom=await page.evaluate(()=>{const g=game3d;g.select('silver','forest',0);g.start();g.world.obstacles.length=0;g.world.patches.length=0;const e=g.spawn('spitter',g.player.x,g.player.z+8);e.cool=0;for(let i=0;i<55;i++)g.step(1/60);return g.zones.some(z=>z.kind==='poison');});
  assert(venom,'spitter should leave a persistent poison zone');
  console.log('PASS mushroom/wolf lunges, golem slam, poison pool and shaman hex');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 for(const viewport of [{width:1440,height:900},{width:844,height:390},{width:390,height:844}]){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<1000}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:8897/');await page.waitForFunction(()=>window.game3d);await page.locator('[data-hero="wraith"]').click();
  assert.equal(await page.locator('#weapons button').allTextContents().then(a=>a.join('/')),'影脉法球/幽刃回旋/夜幕法杖');
  assert(await page.locator('#start').isVisible());
  await page.locator('#start').click();
  const result=await page.evaluate(()=>{const g=window.game3d,p=g.player;p.hp=1000;p.maxHp=1000;g.world.obstacles.length=0;g.world.patches.length=0;
   const foe=g.spawn('golem',p.x,p.z+3);foe.hp=foe.maxHp=10000;foe.speed=0;foe.cool=99;
   p.upgrades.veil=p.upgrades.chain=p.upgrades.rift=1;p.spell.veil=p.spell.chain=p.spell.rift=0;
   g.step(.016);const damage=foe.maxHp-foe.hp,slow=foe.slow;
   p.dash=0;g.world.obstacles.push({x:p.x,z:p.z+2,r:.8});g.hero.rotation.y=0;const before=p.z;g.dash();
   return{damage,slow,shift:p.z-before,vfx:g.vfx.active.length,vfxLimit:g.vfx.limit,hero:g.hero.userData.kind,dash:document.querySelector('#dash').textContent};});
  assert(result.damage>0,JSON.stringify(result));assert(result.slow>0);assert(result.shift>3,JSON.stringify(result));assert(result.vfx<=result.vfxLimit);assert.equal(result.hero,'wraith');
  assert.deepEqual(errors,[]);console.log('PASS shadow hero '+viewport.width+'x'+viewport.height,result);await page.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});

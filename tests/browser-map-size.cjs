const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 for(const [width,height,touch]of [[1440,900,false],[844,390,true]]){
  const p=await browser.newPage({viewport:{width,height},hasTouch:touch}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=cb=>{window.nextFrame=cb;return raf(t=>{if(!window.freezeGame)cb(t)})};});
  await p.goto(process.env.TEST_URL||'http://127.0.0.1:8899/');await p.waitForFunction(()=>window.game3d,null,{timeout:60000});await p.locator('#start').click();await p.evaluate(()=>freezeGame=true);await p.waitForTimeout(60);
  const result=await p.evaluate(async()=>{
   const {clearAt,moveActor}=await import('./world.js?v=38'),{mapPixel,MAP_HALF}=await import('./map-layout.js?v=38'),g=game3d,out=[];
   for(const map of ['forest','snow','ash']){
    g.select('silver',map,0);g.start();g.world.obstacles.length=0;g.world.patches.length=0;g.player.inv=999;
    const outer=g.world.sites.slice(3);if(outer.length!==2)throw Error('missing outer rewards');
    g.player.x=outer[0].x;g.player.z=outer[0].z;g.player.hp=30;for(let i=0;i<130;i++)g.step(1/60);if(outer[0].guards?.length!==4||outer[0].claimed)throw Error('supply guard encounter missing');for(const e of outer[0].guards)e.alive=false;g.step(.01);if(!outer[0].claimed||g.player.hp<=30)throw Error('outer supply not claimable');
    const hp=g.player.hp;g.step(.01);if(g.player.hp!==hp)throw Error('supply was granted twice');
    g.player.x=outer[1].x;g.player.z=outer[1].z;for(let i=0;i<130;i++)g.step(1/60);if(outer[1].guards?.length!==4||outer[1].claimed)throw Error('altar guard encounter missing');for(const e of outer[1].guards)e.alive=false;g.step(.01);if(!outer[1].claimed||g.state!=='upgrade')throw Error('outer altar does not offer an upgrade');
    document.querySelector('[data-upgrade]').click();if(g.state!=='playing')throw Error('altar cannot resume');
    g.world.sites.length=0;g.player.x=70;g.player.z=0;moveActor(g.world,g.player,5,0);if(g.player.x!==75)throw Error('old bounds still block walking');
    g.heroSkills.last=null;const e=g.spawn('golem',78,0);e.cool=999;e.hp=e.maxHp=1e5;e.speed=0;
    if(!g.heroSkills.canHit(75,0,e))throw Error('old bounds block skills');g.heroSkills.area(75,0,5,20);if(e.hp!==e.maxHp-20)throw Error('skill misses in expanded area');
    g.hero.rotation.y=Math.PI/2;g.player.dash=0;g.dash();if(g.player.x<=78||g.player.x>=MAP_HALF)throw Error('teleport cannot use expanded area');
    const at=g.player.x;moveActor(g.world,g.player,10,0);if(g.player.x!==at)throw Error('walk crossed map edge');
    for(const sign of [-1,1]){g.player.x=sign*78;g.player.z=sign*78;g.spawnBoss();if(!g.boss||!clearAt(g.world,g.boss.x,g.boss.z,2)||Math.hypot(g.boss.x-g.player.x,g.boss.z-g.player.z)>24)throw Error('boss not local to new corner');}
    const coordinates=[...g.world.ponds,...g.world.obstacles,...outer,g.player,g.boss];if(coordinates.some(o=>mapPixel(o.x)<6||mapPixel(o.x)>138||mapPixel(o.z)<6||mapPixel(o.z)>138))throw Error('minimap clips markers');
    const mud=g.world.ponds[0];if(mud){g.world.patches=[mud];g.player.x=mud.x;g.player.z=mud.z;for(let i=0;i<20;i++)g.step(.016);const now=performance.now();for(let i=1;i<=4;i++)nextFrame(now+i*100);if(!document.querySelector('#hint').textContent.includes('泥沼'))throw Error('old water label');}
    out.push(map);
   }return out;
  });assert.equal(result.length,3);assert.deepEqual(errors,[]);console.log('PASS outer rewards, movement, teleport, skill damage, local bosses and minimap on all maps',width);await p.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});

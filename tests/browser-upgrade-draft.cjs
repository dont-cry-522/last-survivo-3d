const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{for(const[width,height]of[[1440,900],[844,390],[390,844]]){
 const p=await b.newPage({viewport:{width,height},hasTouch:width<1000}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=cb=>{window.nextFrame=cb;return raf(t=>{if(!window.freezeGame)cb(t)})}});
 await p.goto(process.env.TEST_URL||'http://127.0.0.1:8899/',{waitUntil:'domcontentloaded',timeout:60000});await p.waitForFunction(()=>window.game3d&&!document.querySelector('#start').disabled,null,{timeout:60000});await p.locator('#start').click();await p.evaluate(()=>freezeGame=true);await p.waitForTimeout(70);
 for(const hero of['scout','silver','wraith','tide','lingya']){
  await p.evaluate(hero=>{const g=game3d;g.select(hero,'forest',0);g.start();g.player.inv=999;g.player.attack=999;g.world.obstacles=[];g.world.sites=[];g.world.discoveries=[];g.world.roaming=[];},hero);
  let previous=[];
  for(let level=2;level<=9;level++){
   await p.evaluate(level=>{const g=game3d;g.player.level=level;g.player.pending=1;g.player.xp=0;g.grant(0);},level);
   const cards=p.locator('[data-upgrade]'),ids=await cards.evaluateAll(nodes=>nodes.map(n=>n.dataset.upgrade));
   assert.equal(ids.length,3);assert.equal(new Set(ids).size,3);assert(ids.filter(id=>id.startsWith('path:')).length<=1);
   assert(ids.filter(id=>previous.includes(id)).length<=1,hero+' repetitive hand');previous=ids;
   const before=await p.evaluate(()=>({time:game3d.time,x:game3d.player.x}));await p.evaluate(()=>game3d.step(1));assert.equal(await p.evaluate(()=>game3d.time),before.time);
   await cards.nth(level%3).click();assert.equal(await p.evaluate(()=>game3d.state),'playing');assert.equal(await p.evaluate(()=>game3d.player.pending),0);
   await p.keyboard.down('d');await p.evaluate(()=>{for(let i=0;i<12;i++)game3d.step(1/60)});await p.keyboard.up('d');assert.notEqual(await p.evaluate(()=>game3d.player.x),before.x,'movement stuck after choosing');
  }
  await p.evaluate(()=>{game3d.player.pending=3;game3d.grant(0)});for(let i=0;i<3;i++)await p.locator('[data-upgrade]').first().click();assert.equal(await p.evaluate(()=>game3d.state),'playing');assert.equal(await p.evaluate(()=>game3d.player.pending),0);
  await p.evaluate(()=>game3d.start());assert.equal(await p.evaluate(()=>game3d.player.upgradeDraft),undefined);
  for(let run=0;run<3;run++){
   const old=await p.evaluate(()=>JSON.parse(localStorage.getItem('forest-echoes-opening:'+game3d.player.heroId+':'+game3d.player.weaponId)));
   await p.evaluate(()=>{game3d.start();game3d.player.level=2;game3d.player.pending=1;game3d.grant(0)});
   const ids=await p.locator('[data-upgrade]').evaluateAll(nodes=>nodes.map(n=>n.dataset.upgrade));assert(ids.filter(id=>old.includes(id)).length<=1,'opening repeats across runs');
   await p.locator('[data-upgrade]').first().click();
  }
 }
 const opening=await p.evaluate(()=>JSON.parse(localStorage.getItem('forest-echoes-opening:lingya:boomerang')));
 await p.reload({waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.game3d&&!document.querySelector('#start').disabled);await p.locator('#start').click();await p.evaluate(()=>freezeGame=true);await p.waitForTimeout(60);
 await p.evaluate(()=>{game3d.select('lingya','forest',0);game3d.start();game3d.player.level=2;game3d.player.pending=1;game3d.grant(0)});
 const afterReload=await p.locator('[data-upgrade]').evaluateAll(nodes=>nodes.map(n=>n.dataset.upgrade));assert(afterReload.filter(id=>opening.includes(id)).length<=1,'opening memory lost on reload');await p.locator('[data-upgrade]').first().click();
 await p.evaluate(()=>{game3d.start();localStorage.setItem('forest-echoes-opening:'+game3d.player.heroId+':'+game3d.player.weaponId,'{broken');game3d.player.level=2;game3d.player.pending=1;game3d.grant(0)});assert.equal(await p.locator('[data-upgrade]').count(),3);await p.locator('[data-upgrade]').first().click();
 await p.evaluate(()=>{Storage.prototype.getItem=()=>{throw Error('disabled')};Storage.prototype.setItem=()=>{throw Error('disabled')};game3d.start();game3d.player.level=2;game3d.player.pending=1;game3d.grant(0)});assert.equal(await p.locator('[data-upgrade]').count(),3);await p.locator('[data-upgrade]').first().click();
 assert.deepEqual(errors,[]);console.log('PASS '+width+'x'+height+' all heroes: varied real upgrade cards, selection, pause, resumed movement, chained upgrades, reset and varied openings across runs');await p.close();
}}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});

// Retained entry point: Guardian is retired; verify the remaining roster and maps.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'../../mobile-check/node_modules/playwright');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  for(const[width,height]of[[1440,900],[844,390],[390,844],[320,640]]){
   const p=await browser.newPage({viewport:{width,height},hasTouch:width<1000}),errors=[];
   p.on('pageerror',e=>errors.push(e.message));
   await p.addInitScript(()=>{
    localStorage.setItem('forest-echoes-expedition-v1',JSON.stringify({relics:['wind'],wins:['forest:hammer','forest:rifle']}));
    const raf=requestAnimationFrame;
    window.requestAnimationFrame=cb=>{window.nextFrame=cb;return raf(t=>{if(!window.freezeGame)cb(t)})};
   });
   await p.goto(process.env.TEST_URL||'http://127.0.0.1:8897/',{waitUntil:'domcontentloaded',timeout:60000});
   await p.waitForFunction(()=>window.game3d&&!document.querySelector('#start').disabled,null,{timeout:90000});
   assert.equal(await p.locator('[data-hero]').count(),6);
   assert.equal(await p.locator('[data-hero=guardian]').count(),0);
   assert(!(await p.locator('#menu').innerText()).includes('磐山'));
   assert((await p.locator('#journal-open').innerText()).includes('1/72'),'journal still counts retired weapons');
   const history=await p.evaluate(()=>JSON.parse(localStorage.getItem('forest-echoes-expedition-v1')));
   assert.deepEqual(history.wins,['forest:hammer','forest:rifle'],'existing journal was erased');
   const fallback=await p.evaluate(()=>{game3d.select('guardian','removed-map',999);return{hero:game3d.player.heroId,weapon:game3d.player.weaponId};});
   assert.deepEqual(fallback,{hero:'silver',weapon:'crossbow'},'retired setup does not safely fall back');
   const layout=await p.locator('.hero-options').evaluate(root=>{
    const style=getComputedStyle(root),columns=style.gridTemplateColumns.split(' ').length;
    const rect=root.getBoundingClientRect(),gap=parseFloat(style.columnGap)||0;
    const buttons=[...root.querySelectorAll('[data-hero]')].map(el=>{
     const r=el.getBoundingClientRect();return{id:el.dataset.hero,x:r.x,y:r.y,w:r.width,h:r.height};
    });
    return{buttons,columns,gap,x:rect.x,width:rect.width,children:root.children.length,overflow:root.scrollWidth>root.clientWidth+1};
   });
   assert.equal(layout.children,6,'hero list retains a hidden or empty slot');
   assert(!layout.overflow,'hero list overflows horizontally');
   for(let i=0;i<layout.buttons.length;i++){
    const b=layout.buttons[i],column=i%layout.columns;
    assert(b.w>0&&b.h>0,'hero button hidden');
    assert(Math.abs(b.x-(layout.x+column*(b.w+layout.gap)))<2,'hero list has an interior gap');
    if(i>=layout.columns)assert(b.y>layout.buttons[i-layout.columns].y,'hero rows overlap');
   }
   const catalog=await p.evaluate(async()=>{
    const version=new URL(document.querySelector('script[src*="main.js"]').src).search;
    const {HERO_LOADOUTS,WEAPONS,WEAPON_PATHS,MAPS}=await import('./rules.js'+version);
    const {EXTRA_SKILLS}=await import('./skill-catalog.js'+version);
    return{loadouts:HERO_LOADOUTS,weapons:Object.keys(WEAPONS),routes:Object.keys(WEAPON_PATHS),maps:Object.keys(MAPS),skills:EXTRA_SKILLS.map(s=>({id:s.id,hero:s.hero}))};
   });
   assert.deepEqual(Object.keys(catalog.loadouts).sort(),['lingya','scout','silver','tide','wraith','wuling']);
   assert.equal(catalog.weapons.length,12);assert.equal(catalog.routes.length,24);
   assert(!catalog.weapons.includes('hammer')&&!catalog.routes.some(id=>id.startsWith('hammer_')));
   assert(!catalog.skills.some(s=>s.hero==='guardian'||['fault','reprisal','landing'].includes(s.id)));
   assert.deepEqual(catalog.maps.sort(),['ash','coast','confluence','forest','sand','snow']);
   const actualWeapons=[];
   for(const[hero,weapons]of Object.entries(catalog.loadouts)){
    await p.locator('[data-hero='+hero+']').click();
    assert.equal(await p.locator('#weapons button').count(),weapons.length);
    for(let i=0;i<weapons.length;i++){
     await p.locator('#weapons button').nth(i).click();
     const selected=await p.evaluate(()=>({hero:game3d.player.heroId,weapon:game3d.player.weaponId}));
     assert.equal(selected.hero,hero);assert.equal(selected.weapon,weapons[i]);
     actualWeapons.push(selected.weapon);
    }
   }
   assert.equal(new Set(actualWeapons).size,12,'remaining weapon buttons do not select all weapons');
   await p.locator('#travel-tab').click();assert.equal(await p.locator('[data-map]').count(),6);
   for(const map of['forest','sand']){await p.locator('[data-map='+map+']').click();assert(await p.locator('[data-map='+map+']').evaluate(el=>el.classList.contains('selected')));}
   await p.locator('#loadout-tab').click();await p.locator('[data-hero=tide]').click();
   await p.locator('#start').click();await p.evaluate(()=>{freezeGame=true});await p.waitForTimeout(60);
   const bosses=await p.evaluate(()=>{
    const g=game3d,out=[];
    for(const map of['forest','sand']){
     g.select('tide',map,0);g.start();g.player.inv=999;g.player.attack=999;g.spawnBoss();
     if(!g.boss?.alive||!g.boss.mesh.userData.bossModel)throw Error('Map boss removed: '+map);
     const boss=g.boss;for(let i=0;i<5;i++)g.step(1/60);
     g.renderer.render(g.vfx.scene,g.camera);out.push({map,kind:boss.kind});
     g.pause();const time=g.time;g.step(1);if(g.time!==time)throw Error('Pause failed');g.resume();
    }
    return out;
   });
   assert.equal(bosses.length,2);assert.notEqual(bosses[0].kind,bosses[1].kind);
   // Keep the original scout/silver six-weapon skeletal regression coverage.
   if(width===1440)await p.evaluate(async()=>{
    const version=new URL(document.querySelector('script[src*="main.js"]').src).search;
    const {createSkinnedHero,animateSkinnedHero,disposeHero}=await import('./skinned-hero.js'+version);
    for(const[kind,weapons]of Object.entries({scout:['rifle','shotgun','fire'],silver:['crossbow','shuriken','dark']}))for(const weapon of weapons){
     const hero=createSkinnedHero(kind,weapon);
     for(let i=0;i<120;i++){hero.userData.reloadPhase=(i%45)/45;animateSkinnedHero(hero,i/60,4,i%45<10?.15:0,0);}
     hero.updateMatrixWorld(true);hero.traverse(o=>{if(!o.matrixWorld.elements.every(Number.isFinite))throw Error(kind+'/'+weapon+' nonfinite skeleton')});
     disposeHero(hero);
    }
   });
   assert.deepEqual(errors,[]);
   console.log('PASS '+width+'x'+height+': six hero buttons without gaps, twelve selectable weapons, 24 routes, retired skills absent, six maps, forest/sand bosses, pause; '+JSON.stringify(bosses));
   await p.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});

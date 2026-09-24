const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,headless:true});try{
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=cb=>raf(t=>{if(!window.freezeGame)cb(t);});});
await page.goto(process.env.TEST_URL||'http://127.0.0.1:8897/');await page.waitForFunction(()=>window.game3d);await page.locator('#start').click();await page.evaluate(()=>window.freezeGame=true);await page.waitForTimeout(60);
const audio=await page.evaluate(async()=>{
 const{GameAudio}=await import('./audio.js?v=29'),{ENEMY_VOICES}=await import('./enemy-audio.js?v=29');let rendered=0,minRms=1,maxPeak=0;
 for(const kind of Object.keys(ENEMY_VOICES))for(const event of ['step','wind','attack','impact','hurt','death']){
  const c=new OfflineAudioContext(2,44100,44100),a=new GameAudio(c);a.setup();a.muted=false;a.applyVolumes(true);a.available=()=>a.ready&&!a.muted&&a.nodes<100;
  if(!a.creature(kind,event,1,-1))throw Error(kind+' rejected');const renderedBuffer=await c.startRendering(),left=renderedBuffer.getChannelData(0),right=renderedBuffer.getChannelData(1);let l=0,r=0;
  for(let i=0;i<left.length;i++){l+=left[i]**2;r+=right[i]**2;maxPeak=Math.max(maxPeak,Math.abs(left[i]),Math.abs(right[i]));}
  const rms=Math.sqrt((l+r)/(2*left.length));if(rms<.00015||r<=l)throw Error(kind+' '+event+' silent or wrong stereo '+JSON.stringify({rms,l,r}));minRms=Math.min(minRms,rms);if(a.nodes||a.creatureSources.size)throw Error('source leak');rendered++;
 }
 const c=new OfflineAudioContext(1,44100,44100),a=new GameAudio(c);a.setup();a.muted=false;a.available=()=>a.ready&&!a.muted&&a.nodes<100;
 if(a.creature('wolf','wind',30,0)||a.creature('wolf','step',8,0))throw Error('distance culling');a.muted=true;if(a.creature('wolf','attack'))throw Error('muting');a.muted=false;
 if(!a.creature('wolf','step')||a.creature('golem','step'))throw Error('global step budget');
 a.creatureSources=new Set(Array.from({length:4},()=>({stop(){}})));if(a.creature('yeti','step')||!a.creature('yeti','wind'))throw Error('warnings must have priority over footsteps');
 a.creatureSources=new Set(Array.from({length:10},()=>({stop(){}})));if(a.creature('golem','wind'))throw Error('voice cap');a.creatureSources.clear();await c.startRendering();
 return{rendered,minRms,maxPeak};
});assert.equal(audio.rendered,108);assert(audio.maxPeak<1);console.log('PASS 108 Web Audio renders, stereo, distance, mute, priority, cap and source cleanup',audio);
const gameplay=await page.evaluate(async()=>{
 const g=game3d,{MAP_ROSTERS}=await import('./map-enemies.js?v=28'),{ENEMY_MOTION}=await import('./enemy-motion.js?v=28'),events=[];
 const original=g.audio.creature;g.audio.creature=(kind,event,dx,dz)=>{events.push({kind,event,dx,dz,t:g.time});return true;};
 const setup=map=>{g.select('silver',map,0);g.start();g.world.obstacles.length=0;g.world.patches.length=0;g.player.hp=g.player.maxHp=100000;g.player.attack=999;events.length=0;};
 const advance=seconds=>{for(let i=0;i<seconds*60;i++){g.step(1/60);g.vfx.update(1/60);}};
 let checked=0;
 for(const[map,roster]of Object.entries(MAP_ROSTERS))for(const[role,kind]of Object.entries(roster)){
  setup(map);let e;if(role==='boss'){g.spawnBoss();e=g.boss;e.turn=1;e.cool=0;}else{e=g.spawn(role,g.player.x,g.player.z+Math.min(8,ENEMY_MOTION[kind].range-.2));e.cool=0;e.speed=0;}
  events.length=0;advance(.05);if(!events.some(v=>v.kind===kind&&v.event==='wind'))throw Error(kind+' missing warning');
  const delay=role==='boss'?1.5:ENEMY_MOTION[kind].wind;advance(delay+.95);
  if(!events.some(v=>v.kind===kind&&v.event===(role==='boss'?'impact':'attack')))throw Error(kind+' missing release');
  if(['spitter','shaman'].includes(role)&&!events.some(v=>v.kind===kind&&v.event==='impact'))throw Error(kind+' missing zone impact');
  const releases=events.filter(v=>v.kind===kind&&v.event==='attack');if(releases.some(v=>v.t<delay-.025))throw Error(kind+' early attack audio');
  g.hurtEnemy(e,1);g.hurtEnemy(e,1e9);if(events.filter(v=>v.kind===kind&&v.event==='death').length!==1)throw Error(kind+' death repeated/missing');
  if(!g.vfx.active.length)throw Error(kind+' missing remains');checked++;
 }
 setup('forest');let e=g.spawn('spitter',g.player.x,g.player.z+6);e.cool=0;advance(.15);e.stagger=1;events.length=0;advance(.6);if(events.some(v=>v.kind==='spitter'&&v.event==='attack'))throw Error('interrupted cast produced release audio');
 setup('snow');e=g.spawn('wolf',g.player.x,g.player.z+5);e.cool=99;advance(.6);if(!events.some(v=>v.event==='step'))throw Error('missing actual movement foley');
 g.pause();events.length=0;g.step(1);if(events.length)throw Error('paused sound fired');g.audio.creature=original;g.resume();g.audio.cooldowns.clear();g.audio.creature('wolf','wind');g.start();if(g.audio.cooldowns.size)throw Error('reset retained cooldown');return checked;
});assert.equal(gameplay,18);assert.deepEqual(errors,[]);console.log('PASS all 18 species actual anticipation/release/impact/death hooks, movement, interruption, pause/reset');
await page.close();
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});


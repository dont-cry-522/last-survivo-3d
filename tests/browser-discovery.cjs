const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 for(const [width,height,touch]of [[1440,900,false],[844,390,true],[390,844,true]]){
  const p=await browser.newPage({viewport:{width,height},hasTouch:touch}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=cb=>{window.nextFrame=cb;return raf(t=>{if(!window.freezeGame)cb(t)})};});
  await p.goto(process.env.TEST_URL||'http://127.0.0.1:8899/');await p.waitForFunction(()=>window.game3d,null,{timeout:60000});await p.evaluate(()=>freezeGame=true);await p.waitForTimeout(60);await p.locator('#start').click();
  if(process.env.OUTPUT_DIR)await p.screenshot({path:process.env.OUTPUT_DIR+'/discovery-start-'+width+'.png'});
  const result=await p.evaluate(()=>{
   const g=game3d,ctx=document.querySelector('#map canvas').getContext('2d'),original=ctx.fillText.bind(ctx),labels=[];ctx.fillText=(text,...args)=>{labels.push(text);original(text,...args);};
   let paintTime=performance.now();const paint=()=>{labels.length=0;paintTime=Math.max(paintTime,performance.now());for(let i=1;i<=4;i++)nextFrame(paintTime+=100);};
   const advance=target=>{while(g.time<target){for(const e of g.enemies)e.alive=false;g.step(1/60);}};
   g.player.inv=999;g.player.attack=999;paint();if(g.world.sites.some(s=>s.discovered||s.mesh.visible)||labels.length||/米|净化|伏击/.test(document.querySelector('#objective-detail').textContent))throw Error('opening leaks all landmarks');
   const s=g.world.sites.find(s=>s.event==='purify');g.player.x=s.x;g.player.z=s.z;g.step(.01);paint();if(s.discovered||s.mesh.visible||s.state||s.eventRun||labels.includes('净化'))throw Error('event visible or active before its time');
   g.pause();const before=g.time;g.step(100);if(g.time!==before||s.discovered)throw Error('pause unlocked an event');g.resume();g.player.x=80;g.player.z=-80;advance(s.availableAt+.1);paint();if(s.discovered||s.mesh.visible||labels.includes('净化'))throw Error('timer globally reveals event');
   g.player.x=s.x+15;g.player.z=s.z;g.step(.01);paint();if(!s.discovered||!s.mesh.visible||!s.trail.visible||s.state||!labels.includes('净化'))throw Error('nearby discovery is not separate from activation');
   advance(g.time+1);if(s.mesh.position.y!==0||s.mesh.scale.y!==1)throw Error('reveal does not settle');g.player.x=80;g.player.z=-80;g.step(.01);paint();if(!s.discovered||!labels.includes('净化'))throw Error('discovery forgotten on departure');
   g.player.x=s.x;g.player.z=s.z;advance(g.time+2.2);if(s.state!=='active'||s.guards.length!==3)throw Error('discovered event cannot activate');
   g.player.x=80;g.player.z=-80;const a=g.world.sites.find(s=>s.event==='ambush');advance(a.availableAt+.1);paint();if(a.discovered||labels.includes('伏击'))throw Error('late event auto-revealed');g.player.x=a.x+15;g.player.z=a.z;g.step(.01);paint();if(!a.discovered||!labels.includes('伏击'))throw Error('later discovery failed');
   const known=g.world.sites.filter(s=>s.discovered).length;g.start();if(g.world.sites.some(s=>s.discovered||s.mesh.visible))throw Error('restart retained discovery');ctx.fillText=original;return{known,windows:g.world.sites.map(s=>s.availableAt)};
  });assert.deepEqual(errors,[]);console.log('PASS staged availability, local discovery, hidden UI/models, pause, activation, persistence and reset',width,result);await p.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});

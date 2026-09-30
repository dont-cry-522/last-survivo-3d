const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const page=await browser.newPage();await page.goto(process.env.TEST_URL||'http://127.0.0.1:8899/',{waitUntil:'domcontentloaded',timeout:60000});
 for(const map of['sand','coast']){
  const result=await page.evaluate(async map=>{
   const {GameAudio}=await import('./audio.js?v=82'),{BIOME_THEMES}=await import('./biome-music.js?v=82'),theme=BIOME_THEMES[map];
   const rate=22050,step=60/theme.bpm/2,beats=theme.meter*theme.bars.length,total=step*beats*2+.9,c=new OfflineAudioContext(2,Math.ceil(rate*total),rate),a=new GameAudio(c);
   a.setup();a.muted=false;a.musicVolume=.65;a.applyVolumes(true);a.available=()=>a.ready&&!a.muted&&a.nodes<100;
   let beat=0,dropped=0,peakSources=0,peakNodes=0;const musicNote=a.musicNote.bind(a);a.musicNote=(...args)=>{const old=a.musicSources.size;musicNote(...args);if(a.musicSources.size===old)dropped++;};
   const schedule=until=>{while(beat<beats*2&&.1+beat*step<until){a.score(theme,beat,.1+beat*step,step,beat<beats?0:.9);beat++;}peakSources=Math.max(peakSources,a.musicSources.size);peakNodes=Math.max(peakNodes,a.nodes);};
   schedule(1);let next=1,paused=c.suspend(next);const rendered=c.startRendering();
   while(next<total){await paused;await new Promise(r=>setTimeout(r,0));schedule(next+1);next++;if(next<total)paused=c.suspend(next);await c.resume();}
   const buffer=await rendered;await new Promise(r=>setTimeout(r,30));
   const l=buffer.getChannelData(0),r=buffer.getChannelData(1),pcm=new Uint8Array(l.length*4),view=new DataView(pcm.buffer);let peak=0,calm=0,combat=0,countCalm=0,countCombat=0;
   for(let i=0;i<l.length;i++){
    if(!Number.isFinite(l[i]+r[i]))throw Error('non-finite output');peak=Math.max(peak,Math.abs(l[i]),Math.abs(r[i]));
    const time=i/rate;if(time<step*beats){calm+=(l[i]**2+r[i]**2)/2;countCalm++;}else if(time<step*beats*2){combat+=(l[i]**2+r[i]**2)/2;countCombat++;}
    view.setInt16(i*4,Math.round(Math.max(-1,Math.min(1,l[i]))*32767),true);view.setInt16(i*4+2,Math.round(Math.max(-1,Math.min(1,r[i]))*32767),true);
   }
   if(dropped||peak>=.98||a.nodes||a.musicSources.size||a.musicVoices.size||a.musicBuffers.size>48)throw Error(JSON.stringify({map,dropped,peak,nodes:a.nodes,cache:a.musicBuffers.size}));
   calm=Math.sqrt(calm/countCalm);combat=Math.sqrt(combat/countCombat);if(combat<calm*1.04)throw Error('missing sustained combat contrast');
   let binary='';for(let i=0;i<pcm.length;i+=16384)binary+=String.fromCharCode(...pcm.subarray(i,i+16384));
   return{map,rate,seconds:total,peak,calm,combat,peakSources,peakNodes,cache:a.musicBuffers.size,pcm:btoa(binary)};
  },map);
  const pcm=Buffer.from(result.pcm,'base64');delete result.pcm;const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(pcm.length+36,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(2,22);header.writeUInt32LE(result.rate,24);header.writeUInt32LE(result.rate*4,28);header.writeUInt16LE(4,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
  const dir=process.env.OUTPUT_DIR||'../../outputs';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,map+'-music-v65.wav'),Buffer.concat([header,pcm]));console.log('PASS complete melody loop, calm/combat and bounded voices '+JSON.stringify(result));
 }
 await page.close();
 for(const[width,height]of[[1440,900],[844,390],[390,844]]){
  const p=await browser.newPage({viewport:{width,height},hasTouch:width<1000}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(process.env.TEST_URL||'http://127.0.0.1:8899/',{waitUntil:'domcontentloaded',timeout:60000});await p.waitForFunction(()=>window.game3d&&!document.querySelector('#start').disabled,null,{polling:200,timeout:60000});await p.locator('#start').click();
  const state=await p.evaluate(async()=>{
   const g=game3d,a=g.audio,wait=ms=>new Promise(r=>setTimeout(r,ms));a.setMuted(false);a.setVolume('music',.65);const maps=[];
   for(const map of['sand','coast']){g.select('lingya',map,0);g.start();await wait(650);if(a.map!==map||a.ctx.state!=='running'||!a.musicBuffers.size)throw Error('map music failed to start');a.threat('boss');await wait(250);g.pause();await wait(150);if(a.musicSources.size||a.musicVoices.size)throw Error('pause retained music voices');g.resume();await wait(350);maps.push({map,beat:a.beat,cache:a.musicBuffers.size,nodes:a.nodes});}
   a.setMuted(true);await wait(180);if(a.master.gain.value>.01)throw Error('mute failed');a.setMuted(false);g.menu();return maps;
  });assert.deepEqual(errors,[]);console.log('PASS '+width+'x'+height+' gesture start, map change, threat, pause/resume, mute '+JSON.stringify(state));await p.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});

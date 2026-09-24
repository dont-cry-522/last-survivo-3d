const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const page=await browser.newPage();await page.goto(process.env.TEST_URL||'http://127.0.0.1:8897/');
 const result=await page.evaluate(async()=>{
  const {GameAudio}=await import('./audio.js?v=34'),results=[];
  for(const map of ['forest','snow','ash']){
   const energies=[];
   for(const pressure of [.06,.85]){
    const c=new OfflineAudioContext(2,44100*4,44100),a=new GameAudio(c);a.setup();a.muted=false;a.applyVolumes(true);a.available=()=>a.ready&&!a.muted&&a.nodes<100;
    let theme;const score=a.score;a.score=th=>{theme=th;};a.update(.04,{map,pressure});a.score=score;
    for(let beat=0;beat<8;beat++)a.score(theme,beat,.1+beat*.25,.25,pressure);
    const rendered=await c.startRendering();await new Promise(resolve=>setTimeout(resolve,30));const left=rendered.getChannelData(0),right=rendered.getChannelData(1);let energy=0,peak=0;
    for(let i=0;i<left.length;i++){if(!Number.isFinite(left[i]+right[i]))throw Error('invalid music');energy+=(left[i]**2+right[i]**2)/2;peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));}
    const rms=Math.sqrt(energy/left.length);if(rms<.005||peak>=1||a.nodes||a.proceduralSources.size)throw Error('silent/clipped/leaking music '+JSON.stringify({map,pressure,rms,peak,nodes:a.nodes}));energies.push(rms);
   }
   if(energies[1]<=energies[0]*1.05)throw Error('combat lacks contrast '+map);results.push({map,calm:energies[0],combat:energies[1]});
  }
  const crowdedContext=new OfflineAudioContext(1,44100,44100),crowded=new GameAudio(crowdedContext);crowded.setup();crowded.muted=false;crowded.available=()=>crowded.ready&&!crowded.muted&&crowded.nodes<100;
  for(let i=0;i<100;i++)crowded.voice(220,.5,.0002);if(crowded.nodes!==100)throw Error('audio saturation fixture failed');
  let pauseGain=null;const setGain=crowded.music.gain.setTargetAtTime.bind(crowded.music.gain);crowded.music.gain.setTargetAtTime=(value,...args)=>{pauseGain=value;return setGain(value,...args);};
  crowded.update(.04,{mode:'paused'});if(pauseGain!==0)throw Error('full audio budget prevented pause fade');await crowdedContext.startRendering();
  const c=new OfflineAudioContext(2,44100*2,44100),a=new GameAudio(c);a.setup();a.muted=false;a.available=()=>a.ready&&!a.muted;
  a.score=()=>{};for(let i=0;i<90;i++)a.update(1/30,{pressure:.85});const high=a.pressure;a.update(1/30,{pressure:.06});if(!(a.pressure<high&&a.pressure>high-.03))throw Error('music transition snapped');
  for(let i=0;i<150;i++)a.update(1/30,{pressure:.06});if(a.pressure>.15)throw Error('music failed to settle');const hold=a.pressure;a.update(1,{mode:'paused',pressure:1});if(a.pressure!==hold)throw Error('paused pressure changed');
  a.resolve();const count=a.nodes;a.resolve();if(count!==3||a.nodes!==count)throw Error('reward chord repeats');a.muted=true;a.resolve();if(a.nodes!==count)throw Error('muted chord');await c.startRendering();await new Promise(resolve=>setTimeout(resolve,30));if(a.nodes)throw Error('reward chord leaked');
  return results;
 });assert.equal(result.length,3);console.log('PASS three biome scores, calm/combat contrast, smooth recovery, pause, reward chord and mute',result);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});

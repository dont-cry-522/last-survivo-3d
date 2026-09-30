const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const page=await browser.newPage();await page.goto(process.env.TEST_URL||'http://127.0.0.1:8899/');
 const result=await page.evaluate(async()=>{
  const {GameAudio}=await import('./audio.js?v=78'),results=[];
  for(const map of ['forest','snow','ash','sand','coast']){
   const energies=[];
   for(const pressure of [.06,.85]){
    const c=new OfflineAudioContext(2,44100*4,44100),a=new GameAudio(c);a.setup();a.muted=false;a.applyVolumes(true);a.available=()=>a.ready&&!a.muted&&a.nodes<100;
    let theme;const score=a.score;a.score=th=>{theme=th;};a.update(.04,{map,pressure});a.score=score;
    for(let beat=0;beat<8;beat++)a.score(theme,beat,.1+beat*.25,.25,pressure);
    const rendered=await c.startRendering();await new Promise(resolve=>setTimeout(resolve,30));const left=rendered.getChannelData(0),right=rendered.getChannelData(1);let energy=0,peak=0;
    for(let i=0;i<left.length;i++){if(!Number.isFinite(left[i]+right[i]))throw Error('invalid music');energy+=(left[i]**2+right[i]**2)/2;peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));}
    const rms=Math.sqrt(energy/left.length);if(rms<.005||peak>=1||a.nodes||a.proceduralSources.size||a.musicSources.size)throw Error('silent/clipped/leaking music '+JSON.stringify({map,pressure,rms,peak,nodes:a.nodes}));energies.push(rms);
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
  const live=new AudioContext(),music=new GameAudio(live);await music.init();music.muted=false;music.applyVolumes(true);
  for(let i=0;i<56;i++){music.musicNote(i%2?'lute':'wood',40+i,.03,.002,live.currentTime);await new Promise(r=>setTimeout(r,55));if(music.musicBuffers.size>48||music.musicSources.size>32)throw Error('unbounded music cache/voices');}
  music.musicNote('reed',60,1,.1,live.currentTime+.3);music.voice(220,1,.05,'sine',null,live.currentTime+.3,'music');music.reset('coast');await new Promise(r=>setTimeout(r,80));if(music.nodes||music.musicSources.size||music.musicVoices.size)throw Error('map change retained old music');
  music.muted=true;music.musicNote('wood',61,.5,.1,live.currentTime);if(music.nodes)throw Error('muted music note');await live.close();
  return results;
 });assert.equal(result.length,5);console.log('PASS five biome scores, calm/combat contrast, smooth recovery, pause, reward chord and mute',result);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});

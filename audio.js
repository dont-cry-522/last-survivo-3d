import{weaponSample}from'./weapon-audio.js?v=30';
import{creatureSample,creatureSpatial,ENEMY_VOICES}from'./enemy-audio.js?v=29';
// Original procedural score and sound design. No external audio downloads.
const midi=n=>440*2**((n-69)/12);
const THEMES={
  forest:{bpm:104,root:57,chords:[0,5,3,7],lead:[12,0,19,17,15,0,12,10,12,15,19,0,22,19,17,0,15,0,12,10,7,10,12,0,15,17,19,15,12,10,7,0]},
  snow:{bpm:90,root:62,chords:[0,3,5,7],lead:[19,0,22,0,24,22,19,0,17,0,15,17,19,0,12,0,15,0,19,0,22,19,17,15,12,0,10,12,15,0,17,0]},
  ash:{bpm:116,root:50,chords:[0,0,5,7],lead:[12,7,12,0,15,12,17,15,12,0,10,7,10,12,15,0,19,17,15,12,17,15,12,10,7,10,12,15,12,0,7,0]}
};
export class GameAudio{
  constructor(context=null){
    this.ctx=context;this.ready=false;this.muted=false;this.musicVolume=.65;this.sfxVolume=.8;
    this.beat=0;this.next=0;this.map='forest';this.pressure=0;this.mode='menu';this.cooldowns=new Map();this.nodes=0;this.proceduralSources=new Set();this.weaponBuffers=new Map();this.weaponSources=new Set();this.creatureBuffers=new Map();this.creatureSources=new Set();
    try{const v=JSON.parse(localStorage.getItem('forest3d-audio')||'null');if(v){this.muted=!!v.muted;this.musicVolume=this.clamp(v.music,.65);this.sfxVolume=this.clamp(v.sfx,.8);}}catch{}
  }
  clamp(n,f){return Number.isFinite(n)?Math.max(0,Math.min(1,n)):f;}
  save(){try{localStorage.setItem('forest3d-audio',JSON.stringify({muted:this.muted,music:this.musicVolume,sfx:this.sfxVolume}));}catch{}}
  setup(){
    if(this.ready)return;const c=this.ctx;
    this.master=c.createGain();this.music=c.createGain();this.sfx=c.createGain();
    const limiter=c.createDynamicsCompressor();limiter.threshold.value=-14;limiter.knee.value=14;limiter.ratio.value=5;limiter.attack.value=.004;limiter.release.value=.15;
    this.music.connect(this.master);this.sfx.connect(this.master);this.master.connect(limiter);limiter.connect(c.destination);
    // Short, quiet stereo room keeps the score from sounding like isolated beeps.
    this.room=c.createConvolver();const impulse=c.createBuffer(2,c.sampleRate*1.25,c.sampleRate);
    for(let ch=0;ch<2;ch++){const d=impulse.getChannelData(ch);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3)*.28;}
    this.room.buffer=impulse;const wet=c.createGain();wet.gain.value=.24;this.room.connect(wet);wet.connect(this.music);
    this.noiseBuffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const d=this.noiseBuffer.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    this.ready=true;this.next=c.currentTime+.04;this.applyVolumes(true);
  }
  async init(){try{this.ctx||=new (window.AudioContext||window.webkitAudioContext)();this.setup();if(this.ctx.state==='suspended')await this.ctx.resume();return this.ctx.state==='running';}catch{return false;}}
  applyVolumes(immediate=false){if(!this.ready)return;const t=this.ctx.currentTime;for(const [bus,v]of [[this.master,this.muted?0:.78],[this.music,this.musicVolume],[this.sfx,this.sfxVolume]]){bus.gain.cancelScheduledValues(t);if(immediate)bus.gain.setValueAtTime(v,t);else bus.gain.setTargetAtTime(v,t,.025);}}
  setVolume(bus,value){if(bus==='music')this.musicVolume=this.clamp(value,.65);else this.sfxVolume=this.clamp(value,.8);this.applyVolumes();this.save();}
  setMuted(value){this.muted=value;this.applyVolumes();this.save();}
  reset(map){this.stopWeapons();this.stopCreatures();this.map=map;this.beat=0;this.next=(this.ctx?.currentTime||0)+.04;this.pressure=0;this.cooldowns.clear();}
  available(){return this.ready&&!this.muted&&this.ctx.state==='running'&&this.nodes<100;}
  allow(key,seconds){if(!this.available())return false;const t=this.ctx.currentTime;if((this.cooldowns.get(key)||0)>t)return false;this.cooldowns.set(key,t+seconds);return true;}
  voice(f,d,vol,type='sine',end=null,at=null,bus='sfx',attack=.005,pan=0){
    if(!this.available())return;const c=this.ctx,t=at??c.currentTime,o=c.createOscillator(),g=c.createGain(),p=c.createStereoPanner();
    o.type=type;o.frequency.setValueAtTime(Math.max(20,f),t);if(end)o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+d);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),t+Math.min(attack,d*.3));
    if(bus==='music')g.gain.linearRampToValueAtTime(vol*(d>.8?.7:.3),t+d*(d>.8?.65:.45));
    g.gain.exponentialRampToValueAtTime(.0001,t+d);
    p.pan.value=pan;o.connect(g);g.connect(p);p.connect(this[bus]);if(bus==='music')g.connect(this.room);
    this.nodes++;this.proceduralSources.add(o);o.start(t);o.stop(t+d+.03);o.onended=()=>{o.disconnect();g.disconnect();p.disconnect();this.proceduralSources.delete(o);this.nodes--;};
  }
  noise(d,vol,frequency=1400,end=frequency,at=null,bus='sfx',type='bandpass'){
    if(!this.available())return;const c=this.ctx,t=at??c.currentTime,s=c.createBufferSource(),filter=c.createBiquadFilter(),g=c.createGain();
    s.buffer=this.noiseBuffer;filter.type=type;filter.Q.value=.8;filter.frequency.setValueAtTime(frequency,t);filter.frequency.exponentialRampToValueAtTime(Math.max(30,end),t+d);
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+.003);g.gain.exponentialRampToValueAtTime(vol*.3,t+d*.35);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(filter);filter.connect(g);g.connect(this[bus]);this.nodes++;
    this.proceduralSources.add(s);s.start(t,Math.random()*.7);s.stop(t+d+.02);s.onended=()=>{s.disconnect();filter.disconnect();g.disconnect();this.proceduralSources.delete(s);this.nodes--;};
  }
  stopCreatures(){for(const s of this.creatureSources)s.stop();}
  creature(kind,event,dx=0,dz=0){
    if(!ENEMY_VOICES[kind]||!this.available())return false;
    const {gain,pan}=creatureSpatial(event,dx,dz),quiet=event==='step'||event==='hurt',limit=quiet?4:10;
    if(!gain||this.creatureSources.size>=limit||this.nodes>(quiet?65:88))return false;
    const group=quiet?event:event==='wind'?'warning':'action',interval=event==='step'?.18:event==='hurt'?.12:.045;
    const key='creature-'+kind+'-'+event,t=this.ctx.currentTime;
    if((this.cooldowns.get(key)||0)>t||(this.cooldowns.get('creature-'+group)||0)>t)return false;
    const cacheKey=kind+':'+event;let buffer=this.creatureBuffers.get(cacheKey);
    if(!buffer){const samples=creatureSample(kind,event,this.ctx.sampleRate);if(!samples)return false;buffer=this.ctx.createBuffer(1,samples.length,this.ctx.sampleRate);buffer.copyToChannel(samples,0);this.creatureBuffers.set(cacheKey,buffer);}
    this.cooldowns.set(key,t+(quiet?.3:.14));this.cooldowns.set('creature-'+group,t+interval);
    const source=this.ctx.createBufferSource(),volume=this.ctx.createGain(),panner=this.ctx.createStereoPanner();
    source.buffer=buffer;source.playbackRate.value=.97+Math.random()*.06;volume.gain.value=gain*(event==='step'?.65:1);panner.pan.value=pan;
    source.connect(volume);volume.connect(panner);panner.connect(this.sfx);this.creatureSources.add(source);this.nodes++;
    source.onended=()=>{source.disconnect();volume.disconnect();panner.disconnect();this.creatureSources.delete(source);this.nodes--;};source.start();return true;
  }
  tone(f,d=.12,v=.06,type='sine',end=null){this.voice(f,d,v,type,end);}
  weapon(id,event,variant=0){
    if(!this.available()||this.weaponSources.size>=16)return false;
    const key=id+':'+event+':'+variant;let buffer=this.weaponBuffers.get(key);
    if(!buffer){const samples=weaponSample(id,event,this.ctx.sampleRate,variant);if(!samples)return false;buffer=this.ctx.createBuffer(1,samples.length,this.ctx.sampleRate);buffer.copyToChannel(samples,0);this.weaponBuffers.set(key,buffer);}
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;source.playbackRate.value=.98+Math.random()*.04;gain.gain.value=event==='impact'&&variant?1.2:1;
    source.connect(gain);gain.connect(this.sfx);this.weaponSources.add(source);this.nodes++;source.onended=()=>{source.disconnect();gain.disconnect();this.weaponSources.delete(source);this.nodes--;};source.start();return true;
  }
  stopWeapons(){for(const s of this.weaponSources)s.stop();}
  shot(id){if(this.allow('shot',.045))this.weapon(id,'shot');}
  mechanism(id,stage=0){if(this.allow('mechanism',.065))this.weapon(id,'mechanism',stage);}
  impact(id,strong=false){if(this.allow(strong?'impact-strong':'impact',.085))this.weapon(id,'impact',strong?1:0);}
  threat(kind='wave'){if(!this.allow('threat',2))return;const t=this.ctx.currentTime,deep=kind==='boss';this.voice(deep?58:82,.9,deep?.15:.105,'sawtooth',deep?35:48,t,'music',.04);this.noise(deep?.75:.42,deep?.16:.085,1400,170,t,'music');for(let i=0;i<(deep?4:3);i++)this.voice((deep?147:196)*2**(i/12),.19,.052,'triangle',null,t+i*.105,'music',.008);}
  spell(kind){if(!this.allow('spell-'+kind,.11))return;const t=this.ctx.currentTime;
    if(kind==='ice'){this.noise(.36,.24,4800,1400);[2100,3150,4100,2700].forEach((f,i)=>this.voice(f,.18,.035,'sine',f*.85,t+i*.035));}
    else if(kind==='storm'){this.noise(.22,.45,4200,300);this.voice(64,.4,.21,'sine',26);this.noise(.045,.23,6200,1800,t+.07);}
    else if(kind==='fire'){this.noise(.48,.55,1100,100);this.voice(92,.4,.25,'sine',25);}
    else if(['veil','chain','rift'].includes(kind)){this.noise(kind==='rift'?.4:.25,.2,kind==='chain'?2800:900,130);this.voice(kind==='rift'?70:kind==='chain'?130:95,.42,.16,'triangle',35);}
    else if(kind==='heal'){[440,660,880].forEach((f,i)=>this.voice(f,.35,.027,'sine',null,t+i*.045));}
    else{this.noise(.3,.16,1400,200);this.voice(140,.38,.15,'sine',45);this.voice(300,.25,.025,'triangle',620);}
  }
  skill(kind){
    const cfg={mineSet:[520,180,.09,.07],mineBlast:[105,35,.3,.21],volley:[190,60,.12,.15],counter:[120,42,.22,.18],rainAim:[1300,1900,.18,.04],rain:[1900,700,.15,.07],trailSet:[2600,1400,.12,.025],pursuit:[900,1600,.2,.065],echo:[155,310,.28,.06],echoHit:[260,95,.18,.07],soul:[330,660,.32,.05],spikes:[100,40,.28,.14]}[kind];
    if(!cfg||!this.allow('hero-skill-'+kind,.13))return;const [f,end,duration,volume]=cfg,t=this.ctx.currentTime;
    this.voice(f,duration,volume,kind==='soul'?'sine':'triangle',end);
    if(kind==='soul')this.voice(495,.28,.025,'sine',990,t+.06);
    else this.noise(duration,volume*.9,kind.startsWith('rain')||kind==='trailSet'?4800:kind==='spikes'?1300:2600,kind==='mineBlast'?100:450,t+.012);
  }
  dodge(silver){if(!this.allow('dodge',.2))return;this.noise(silver?.32:.2,.24,silver?4000:650,silver?220:140);if(silver)this.voice(440,.25,.065,'sine',110);}
  hurt(){if(!this.allow('hurt',.15))return;this.noise(.15,.3,700,140);this.voice(130,.22,.25,'sine',36);}
  pickup(){if(!this.allow('pickup',.09))return;this.voice(780+(this.beat%4)*110,.075,.035,'sine',1100);}
  level(){if(!this.allow('level',.35))return;[523.25,659.25,783.99,1046.5].forEach((f,i)=>this.voice(f,.5,.075,'triangle',null,this.ctx.currentTime+i*.085));}
  resolve(){if(!this.allow('resolve',2))return;[293.66,369.99,440].forEach((f,i)=>this.voice(f,.65,.055,'triangle',null,this.ctx.currentTime+i*.12,'music',.025));}
  update(dt,{map='forest',mode='playing',boss=false,pressure=0}={}){
    this.mode=mode;this.map=map;if(!this.available())return;
    const c=this.ctx,paused=mode==='paused'||mode==='lost'||mode==='won';
    this.music.gain.setTargetAtTime(paused?0:this.musicVolume*(mode==='upgrade'?.3:mode==='menu'?.6:1),c.currentTime,.2);
    if(paused){this.next=c.currentTime+.05;return;}
    this.pressure+=(Math.max(boss?1:0,pressure)-this.pressure)*Math.min(1,dt*(pressure>this.pressure?.8:.45));
    const theme=THEMES[map],step=60/(theme.bpm+this.pressure*18)/2;
    // Schedule against the audio clock, with a bounded lookahead; no frame-rate jitter or catch-up burst.
    if(this.next<c.currentTime-.2)this.next=c.currentTime+.025;
    while(this.next<c.currentTime+.13){this.score(theme,this.beat++,this.next,step,mode==='playing'?this.pressure:0);this.next+=step;}
  }
  score(th,b,t,step,pressure){
    const root=th.root,bar=Math.floor(b/8),chord=th.chords[Math.floor(bar/2)%4],n=th.lead[b%th.lead.length];
    if(b%8===0){for(const [i,interval]of [0,3,7].entries())this.voice(midi(root+chord+interval),step*9,.028,'triangle',null,t,'music',.25,(i-1)*.45);}
    if(n){const f=midi(root+n);this.voice(f,step*1.65,.075,th===THEMES.snow?'sine':'triangle',null,t,'music',.025,.12);this.voice(f*2,step*.8,.012,'sine',null,t,'music',.01,-.15);}
    if(b%2===0)this.voice(midi(root-12+chord),step*1.7,.11,'sine',null,t,'music',.012);
    if(b%4===0||pressure>.6&&b%4===3){this.voice(95,.2,.055+pressure*.115,'sine',34,t,'music');this.noise(.06,.015+pressure*.03,1600,350,t,'music');}
    if(b%4===2){this.noise(.13,.022+pressure*.098,1500,700,t,'music');this.voice(165,.12,.04,'triangle',90,t,'music');}
    if(b%4===3||pressure>.25&&b%2===1||pressure>.65)this.noise(.055,.012+pressure*.038,7200,5500,t,'music','highpass');
    if(pressure>.25&&b%2===0)this.voice(midi(root+chord+[0,7,12,7][b%4]),step*.7,.044*pressure,'sawtooth',null,t,'music',.02,-.25);
    if(pressure>.5&&b%4===1){this.voice(midi(root-24),step*.65,.07*pressure,'sawtooth',midi(root-31),t,'music',.008,-.2);this.noise(.075,.045*pressure,2400,320,t,'music');}
  }
}

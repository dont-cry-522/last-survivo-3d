import{MUSIC_TRACKS}from'./music-tracks.js?v=95';

const FADE=2;
const ramp=(param,value,time,duration=FADE)=>{
 if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(time);
 else{const held=param.value;param.cancelScheduledValues(time);param.setValueAtTime(held,time);}
 param.linearRampToValueAtTime(value,time+duration);
};

export class RecordedMusic{
 constructor(context,bus,fallback,{tracks=MUSIC_TRACKS,fetcher=(...args)=>globalThis.fetch(...args)}={}){
  this.ctx=context;this.bus=bus;this.fallback=fallback;this.tracks=tracks;this.fetcher=fetcher;
  this.cache=new Map();this.offsets=new Map();this.failed=new Set();this.fading=new Set();
  this.current=null;this.loading=null;this.desired=null;this.paused=false;this.battle=false;this.hot=0;this.calm=0;
 }
 get active(){return !!this.current;}
 remember(voice){this.offsets.set(voice.key,(voice.offset+Math.max(0,this.ctx.currentTime-voice.started))%voice.buffer.duration);}
 retire(voice,duration=FADE){
  if(!voice)return;
  this.remember(voice);ramp(voice.gain.gain,0,this.ctx.currentTime,duration);
  this.fading.add(voice);voice.source.stop(this.ctx.currentTime+duration+.02);
 }
 start(key,buffer){
  if(this.current?.key===key||this.paused||this.desired!==key||this.ctx.state!=='running')return;
  // Rapid border crossings keep at most one outgoing recording alive.
  for(const voice of this.fading)voice.source.stop();
  this.retire(this.current);
  const source=this.ctx.createBufferSource(),gain=this.ctx.createGain(),t=this.ctx.currentTime,offset=(this.offsets.get(key)||0)%buffer.duration;
  source.buffer=buffer;source.loop=true;source.connect(gain);gain.connect(this.bus);gain.gain.setValueAtTime(0,t);
  const voice={key,buffer,source,gain,offset,started:t};
  source.onended=()=>{source.disconnect();gain.disconnect();this.fading.delete(voice);if(this.current===voice)this.current=null;};
  this.current=voice;source.start(t,offset);ramp(gain.gain,this.tracks[key].gain,t);ramp(this.fallback.gain,0,t);
  this.cache.delete(key);this.cache.set(key,buffer);
  while(this.cache.size>2)this.cache.delete(this.cache.keys().next().value);
 }
 prepare(key){
  if(!key||this.failed.has(key)||this.loading?.key===key||this.current?.key===key)return;
  const saved=this.cache.get(key);if(saved){this.start(key,saved);return;}
  const controller=new AbortController(),load={key,controller,stage:'fetch'};this.loading=load;this.lastError=null;
  const timer=setTimeout(()=>{if(this.loading===load){load.timedOut=true;controller.abort();}},20000);
  load.promise=(async()=>{
   try{
    const response=await this.fetcher(new URL(this.tracks[key].file,import.meta.url),{signal:controller.signal});
    if(!response.ok)throw Error('Music load failed');
    load.stage='download';const bytes=await response.arrayBuffer();load.bytes=bytes.byteLength;load.stage='decode';
    const buffer=await this.ctx.decodeAudioData(bytes);
    // Decoding may finish after a map change or pause. Never play that stale request.
    if(this.loading!==load||this.desired!==key)return;
    this.cache.delete(key);this.cache.set(key,buffer);
    while(this.cache.size>2)this.cache.delete(this.cache.keys().next().value);
    this.start(key,buffer);
   }catch(error){
    if(this.loading===load&&(error.name!=='AbortError'||load.timedOut)){
     this.lastError={key,message:load.timedOut?'load timed out':error.message,stage:load.stage};
     this.failed.add(key);this.retire(this.current);this.current=null;ramp(this.fallback.gain,1,this.ctx.currentTime);
    }
   }finally{clearTimeout(timer);if(this.loading===load)this.loading=null;}
  })();
 }
 update(dt,{map,mode,boss=false,pressure=0}){
  const paused=['paused','event-choice','lost','won'].includes(mode);
  if(paused){
   if(!this.paused){for(const voice of this.fading)voice.source.stop(this.ctx.currentTime+.08);this.retire(this.current,.08);this.current=null;}
   this.paused=true;return;
  }
  this.paused=false;
  if(mode==='playing'){
   this.hot=pressure>.75?this.hot+dt:0;this.calm=!boss&&pressure<.45?this.calm+dt:0;
   if(boss||this.hot>=4)this.battle=true;
   if(this.calm>=7)this.battle=false;
  }else if(mode==='menu'){this.battle=false;this.hot=0;this.calm=0;}
  const key=this.battle?'battle':this.tracks[map]?map:null;
  if(key!==this.desired){
   this.desired=key;
   if(this.loading){this.loading.controller.abort();this.loading=null;}
   if(!key||this.failed.has(key)){this.retire(this.current);this.current=null;ramp(this.fallback.gain,1,this.ctx.currentTime);}
  }
  this.prepare(key);
 }
 reset(){
  if(this.loading)this.loading.controller.abort();this.loading=null;this.desired=null;
  for(const voice of this.fading)voice.source.stop();this.fading.clear();
  if(this.current){this.current.source.stop();this.current=null;}
  this.offsets.clear();this.failed.clear();this.paused=false;this.battle=false;this.hot=0;this.calm=0;
  const t=this.ctx.currentTime;this.fallback.gain.cancelScheduledValues(t);this.fallback.gain.setValueAtTime(1,t);
 }
}

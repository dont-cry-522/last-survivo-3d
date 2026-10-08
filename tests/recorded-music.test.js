import{test}from'node:test';
import assert from'node:assert/strict';
import{RecordedMusic}from'../recorded-music.js';
import{weaponSample,weaponTakeCount}from'../weapon-audio.js';

function harness(){
 const param=()=>({value:1,events:[],cancelScheduledValues(){},cancelAndHoldAtTime(){},setValueAtTime(v,t){this.value=v;this.events.push([v,t]);},linearRampToValueAtTime(v,t){this.value=v;this.events.push([v,t]);}});
 const connectable=()=>({connect(){},disconnect(){}}),sources=[],requests=[];
 const context={currentTime:0,state:'running',createGain:()=>({...connectable(),gain:param()}),
  createBufferSource(){const s={...connectable(),start(t,offset){this.started=[t,offset];},stop(t){this.stopped=t??context.currentTime;if(t===undefined)this.onended?.();}};sources.push(s);return s;},
  async decodeAudioData(bytes){return{duration:60,tag:bytes};}};
 const fallback=context.createGain(),tracks=Object.fromEntries(['forest','snow','ash','coast','battle'].map(key=>[key,{file:key+'.mp3',gain:.6}]));
 const fetcher=(url,{signal})=>new Promise((resolve,reject)=>requests.push({url,signal,resolve:()=>resolve({ok:true,arrayBuffer:async()=>url.pathname}),reject}));
 const music=new RecordedMusic(context,context.createGain(),fallback,{tracks,fetcher});
 const tick=(dt=0,options={})=>music.update(dt,{map:'forest',mode:'playing',...options});
 const loaded=async(index=requests.length-1)=>{const promise=music.loading?.promise;requests[index].resolve();await promise;};
 return{music,context,fallback,sources,requests,tick,loaded};
}

test('recordings load once, fade between maps, resume their position, and keep two decoded buffers',async()=>{
 const h=harness();h.tick();for(let i=0;i<30;i++)h.tick(.04);assert.equal(h.requests.length,1);await h.loaded();
 assert.equal(h.music.current.key,'forest');assert.deepEqual(h.sources[0].started,[0,0]);assert.deepEqual(h.music.current.gain.gain.events.at(-1),[.6,2]);
 h.context.currentTime=12;h.tick(0,{mode:'paused'});assert.equal(h.music.current,null);assert.equal(h.music.offsets.get('forest'),12);
 h.context.currentTime=40;h.tick();assert.equal(h.music.current.key,'forest');assert.deepEqual(h.sources.at(-1).started,[40,12]);assert.equal(h.requests.length,1);
 h.context.currentTime=45;h.tick(0,{map:'snow'});assert.equal(h.music.current.key,'forest');await h.loaded();assert.equal(h.music.current.key,'snow');assert.equal(h.music.fading.size,1);
 const count=h.sources.length;for(let i=0;i<20;i++)h.tick(.04,{map:'snow'});assert.equal(h.sources.length,count,'updates restarted the recording');
 h.tick(0,{map:'ash'});await h.loaded();assert.deepEqual([...h.music.cache.keys()],['snow','ash']);
 h.tick(0,{map:'sand'});assert.equal(h.music.current,null);assert.equal(h.fallback.gain.events.at(-1)[0],1);
 h.music.reset();assert.equal(h.music.fading.size,0);assert.equal(h.music.offsets.size,0);
});

test('the default browser fetch retains its Window/global receiver',async()=>{
 const h=harness(),original=globalThis.fetch;
 globalThis.fetch=function(){assert.equal(this,globalThis,'native fetch was called with the music object as receiver');return Promise.resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});};
 try{
  const music=new RecordedMusic(h.context,h.context.createGain(),h.fallback,{tracks:h.music.tracks});
  music.update(0,{map:'forest',mode:'playing'});await music.loading.promise;
  assert.equal(music.current?.key,'forest');assert.equal(music.failed.size,0);music.reset();
 }finally{globalThis.fetch=original;}
});

test('late loads cannot play an old map or break pause, and failed loads use the fallback without retry storms',async()=>{
 const h=harness();h.tick();const obsolete=h.music.loading.promise;h.tick(0,{map:'snow'});assert(h.requests[0].signal.aborted);
 h.requests[0].resolve();await obsolete;assert.equal(h.sources.length,0);assert(!h.music.cache.has('forest'));
 h.tick(0,{map:'snow',mode:'paused'});await h.loaded(1);assert.equal(h.sources.length,0);h.tick(0,{map:'snow'});assert.equal(h.music.current.key,'snow');
 h.tick(0,{map:'coast'});const failed=h.music.loading.promise;h.requests[2].reject(Error('network unavailable'));await failed;
 assert.equal(h.music.current,null);assert.equal(h.fallback.gain.events.at(-1)[0],1);
 for(let i=0;i<100;i++)h.tick(.04,{map:'coast'});assert.equal(h.requests.length,3);
 h.tick(0,{map:'ash'});const pending=h.music.loading.promise;h.music.reset();h.requests[3].resolve();await pending;assert.equal(h.music.current,null);assert.equal(h.music.desired,null);
});

test('battle music needs sustained pressure, boss enters immediately, and exploration has slower recovery',async()=>{
 const h=harness();h.tick();await h.loaded();
 h.tick(3.9,{pressure:.9});assert(!h.music.battle);h.tick(.1,{pressure:.4});h.tick(3.9,{pressure:.9});assert(!h.music.battle);
 h.tick(.2,{pressure:.9});assert(h.music.battle);assert.equal(h.music.desired,'battle');await h.loaded();
 h.tick(6.9,{pressure:.2});assert(h.music.battle);h.tick(99,{mode:'paused',pressure:0});assert(h.music.battle,'pause advanced recovery');
 h.tick(.2,{pressure:.2});assert(!h.music.battle);assert.equal(h.music.current.key,'forest');
 h.tick(0,{boss:true});assert(h.music.battle);assert.equal(h.music.current.key,'battle');
 h.tick(0,{mode:'menu'});assert(!h.music.battle);assert.equal(h.music.current.key,'forest');
});

test('old weapon textures rotate three bounded takes without overloading strong-hit or combo variants',()=>{
 for(const id of ['rifle','shotgun','crossbow','shuriken','fire','dark','shadowblade','grimoire']){
  assert.equal(weaponTakeCount(id),3);
  for(const variant of[0,1]){
   const takes=[0,1,2].map(take=>weaponSample(id,'shot',22050,variant,take));
   assert.notDeepEqual(takes[0],takes[1]);assert.notDeepEqual(takes[1],takes[2]);
   for(const samples of takes){assert(samples.every(v=>Number.isFinite(v)&&Math.abs(v)<.75));assert(Math.abs(samples[0])<.0001);assert(Math.abs(samples.at(-1))<.001);}
  }
 }
 for(const id of['shield','hammer','harpoon','boomerang','companion','miasmalantern','sporelantern'])assert.equal(weaponTakeCount(id),1);
 for(const variant of[0,1,2])assert.deepEqual(weaponSample('harpoon','impact',22050,variant,0),weaponSample('harpoon','impact',22050,variant,2));
});

test('weapon families retain different physical envelopes and only the crossbow sustains a string period',()=>{
 const rate=22050,energy=s=>s.reduce((sum,n)=>sum+n*n,0);
 for(const take of[0,1,2]){
  const rifle=weaponSample('rifle','shot',rate,0,take);assert(energy(rifle.slice(0,rate*.03))/energy(rifle)>.85,'rifle crack lost its short attack');
  for(const id of['shuriken','fire','dark','grimoire']){
   const sample=weaponSample(id,'shot',rate,0,take);assert(energy(sample.slice(0,rate*.03))/energy(sample)<.08,id+' turned back into a generic transient');
  }
  for(const id of['crossbow','shuriken','fire','dark']){
   const sample=weaponSample(id,'shot',rate,0,take),lag=Math.round(rate/(168+take*2));let self=0,pair=0;
   for(let i=Math.floor(rate*.04);i<rate*.18;i++){self+=sample[i]**2;pair+=sample[i]*sample[i+lag];}
   if(id==='crossbow')assert(pair/self>.75,'crossbow lost its damped string');
   else assert(Math.abs(pair/self)<.5,id+' acquired the same ringing string');
  }
 }
});

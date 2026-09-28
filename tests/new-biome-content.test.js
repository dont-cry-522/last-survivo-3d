import{test}from'node:test';import assert from'node:assert/strict';
import{sandWeather}from'../sand-weather.js';import{terrainAt}from'../water.js';import{buildWorld}from'../world.js';
import{createMapEvent,advanceMapEvent}from'../map-events.js';import{newWeaponSample}from'../new-weapon-audio.js';import{instrumentSample,scoreBiome}from'../biome-music.js';
globalThis.document={createElement:()=>({width:256,height:256,getContext:()=>({fillRect(){}})})};
test('sand warning precedes the storm; wet currents and quicksand affect heroes and monsters, bridges stay safe',()=>{
 assert(sandWeather(18).warning);assert(!sandWeather(18).active);assert(sandWeather(22).active);assert(!sandWeather(29).active);assert.deepEqual(sandWeather(60),sandWeather(22));
 const w={patches:[{kind:'slow',x:0,z:0,r:3}],sandstorm:sandWeather(0)};for(const kind of ['hero','wolf','golem']){const base=terrainAt(w,0,0,kind).speed;w.sandstorm=sandWeather(23);assert(terrainAt(w,0,0,kind).speed<base);assert.equal(terrainAt(w,4,0,kind).speed,1);w.sandstorm=sandWeather(0);}
 w.patches=[{kind:'water',x:0,z:0,rx:4,rz:4,r:5}];for(const kind of ['hero','wolf','reefturtle']){w.tide={high:false};const base=terrainAt(w,0,0,kind).speed;w.tide.high=true;assert(terrainAt(w,0,0,kind).speed<base);}assert.equal(terrainAt(w,0,0,'jellyseer').speed,1);w.bridges=[{x:0,z:0,width:5,length:2}];assert.equal(terrainAt(w,0,0).speed,1);
});
test('both new encounters require two cleared guard waves, safe weather and retained partial progress',()=>{
 for(const id of ['excavation','salvage']){const e=createMapEvent(id),ctx={near:true,atCenter:true,contested:false,guards:0,tide:{},sandstorm:{},player:{x:0,z:0}};
  assert.equal(advanceMapEvent(e,.01,ctx).wave,1);advanceMapEvent(e,1,ctx);assert.equal(e.progress,1);
  for(const change of[{guards:1},{contested:true},{near:false},{atCenter:false},id==='salvage'?{tide:{warning:true}}:{sandstorm:{warning:true}},id==='salvage'?{tide:{high:true}}:{sandstorm:{active:true}}]){advanceMapEvent(e,10,{...ctx,...change});assert.equal(e.progress,1);}
  assert.equal(advanceMapEvent(e,10,ctx).wave,2);assert.equal(e.progress,3);assert(!e.done);advanceMapEvent(e,0,ctx);assert.equal(e.progress,3);advanceMapEvent(e,5,{...ctx,guards:1});assert(!e.done);assert(advanceMapEvent(e,3,ctx).complete);assert(!advanceMapEvent(e,3,ctx).complete);assert.equal(e.progress,6);
 }
});
test('new encounters replace only outer supply ambushes and retain reachable clear sites',()=>{for(const [map,event]of [['sand','excavation'],['coast','salvage']])for(let seed=1;seed<=8;seed++){const w=buildWorld(map,seed);assert.equal(w.sites.length,5);assert.equal(w.sites[3].event,event);assert.equal(w.sites[3].type,'supply');assert(w.sites[3].eventGlow);assert(w.sites[3].availableAt>0);assert(!w.obstacles.some(o=>Math.hypot(o.x-w.sites[3].x,o.z-w.sites[3].z)<3));}});
test('new hero samples have distinct attacks, impacts and combo strokes without clipping or hard edges',()=>{
 const signatures=new Set();for(const id of ['shield','hammer','harpoon','boomerang'])for(const event of ['shot','impact','mechanism'])for(const rate of[22050,48000]){const sample=newWeaponSample(id,event,rate);let energy=0;for(const v of sample){assert(Number.isFinite(v)&&Math.abs(v)<.72);energy+=v*v;}assert(Math.sqrt(energy/sample.length)>.008);assert(Math.abs(sample[0])<.001);assert(Math.abs(sample.at(-1))<.001);if(rate===22050)signatures.add(Array.from(sample.slice(100,130)).join(','));}assert.equal(signatures.size,12);
 for(const event of ['shot','impact']){const a=newWeaponSample('harpoon',event,22050,0),b=newWeaponSample('harpoon',event,22050,1),c=newWeaponSample('harpoon',event,22050,2);assert.notDeepEqual(a,b);assert.notDeepEqual(b,c);}
});
test('new map instruments and arrangements differ beyond tempo and melody',()=>{
 const samples=new Set();for(const kind of ['lute','reed','wood','bow']){const s=instrumentSample(kind,62,22050);assert(s.every(v=>Number.isFinite(v)&&Math.abs(v)<.9));assert(Math.abs(s[0])<.001);assert(Math.abs(s.at(-1))<.001);samples.add(Array.from(s.slice(100,120)).join(','));}assert.equal(samples.size,4);
 const voices=[];const api={musicNote:(...v)=>voices.push(v),voice:()=>{},noise:()=>{}};for(const arrangement of ['sand','coast']){voices.length=0;scoreBiome(api,{arrangement,root:50,chords:[0,5,3,7],lead:[12]},0,0,.3,.1);assert(voices.some(v=>v[0]===(arrangement==='sand'?'lute':'wood')));assert(voices.some(v=>v[0]===(arrangement==='sand'?'reed':'bow')));}
});

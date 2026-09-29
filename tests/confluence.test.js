import{test}from'node:test';import assert from'node:assert/strict';
import{buildWorld,clearAt,moveActor}from'../world.js';
import{REGIONS,biomeAt,biomeWeights,biomeColor,roadDistance}from'../confluence.js';
import{terrainAt,waterDepth}from'../water.js';import{updateTide}from'../coast.js';import{sandWeather}from'../sand-weather.js';
import{recordVictory,writeJournal,readJournal}from'../expedition.js';
test('five distinct climate cores share smooth, curved and normalized borders',()=>{
 for(const r of REGIONS){assert.equal(biomeAt(r.x,r.z),r.id);assert(biomeWeights(r.x,r.z)[r.id]>.98);}
 let blends=0;for(let x=-130;x<=130;x+=4)for(let z=-130;z<=130;z+=4){const weights=Object.values(biomeWeights(x,z));assert(Math.abs(weights.reduce((a,b)=>a+b)-1)<1e-10);assert(weights.every(w=>w>=0&&w<=1));if(Math.max(...weights)<.9)blends++;const a=biomeColor(x,z),b=biomeColor(x+.05,z);assert(Math.abs(a.r-b.r)+Math.abs(a.g-b.g)+Math.abs(a.b-b.b)<.01);}
 assert(blends>300);
});
test('ten seeds retain regional landmarks, local finds, clear loop and reachable spawn',()=>{
 for(let seed=1;seed<=10;seed++){
  const w=buildWorld('confluence',seed);assert.equal(w.half,140);assert(clearAt(w,w.spawn.x,w.spawn.z,1));assert.equal(w.regions.length,5);assert.equal(w.sites.length,11);assert(w.obstacles.length<800);
  for(const r of w.regions){assert.equal(r.landmark.biome,r.id);assert.equal(biomeAt(r.landmark.x,r.landmark.z),r.id);assert.equal(r.discoveries.length,3);assert.equal(r.roaming.length,2);for(const n of [...r.discoveries,...r.roaming]){assert.equal(biomeAt(n.x,n.z),r.id);assert(clearAt(w,n.x,n.z,.6));}assert(clearAt(w,r.landmark.x,r.landmark.z,2));assert(r.weather.half===140);}
  for(const p of w.road){assert(roadDistance(p.x,p.z)<.001);assert(clearAt(w,p.x,p.z,1.1),'blocked road seed '+seed+' '+JSON.stringify(p));if(w.ponds.some(n=>waterDepth(n,p.x,p.z)>0))assert.equal(terrainAt(w,p.x,p.z).kind,'bridge','main road leaves bridge');}
  assert.equal(w.regions.find(r=>r.id==='snow').ice.length,3);assert(w.patches.some(p=>p.kind==='vent'));assert(w.breakables.some(p=>p.tactic==='timber'));assert(w.breakables.some(p=>p.tactic==='wall'));assert(w.bridges.length&&w.fords.length);
 }
});
test('extended bounds work beyond old map edges, while original maps retain old bounds',()=>{
 const w=buildWorld('confluence',4);w.obstacles=[];const p={x:100,z:100};moveActor(w,p,5,0);assert.equal(p.x,105);moveActor(w,p,50,0);assert.equal(p.x,105);assert(!clearAt(w,141,0));assert(!clearAt({obstacles:[]},90,0));
});
test('coastal tides and desert weather do not slow unrelated regions',()=>{
 const w=buildWorld('confluence',2),forest=w.ponds.find(p=>p.biome==='forest'),coast=w.ponds.find(p=>p.biome==='coast');
 const point=p=>({x:p.x,z:p.z+3});updateTide(w,0);const f=point(forest),c=point(coast),beforeForest=terrainAt(w,f.x,f.z).speed,beforeCoast=terrainAt(w,c.x,c.z).speed,rx=forest.rx;updateTide(w,21);assert.equal(forest.rx,rx);assert.equal(terrainAt(w,f.x,f.z).speed,beforeForest);assert(terrainAt(w,c.x,c.z).speed<beforeCoast);
 const patches=[{kind:'slow',x:0,z:0,r:2,biome:'forest'},{kind:'slow',x:10,z:0,r:2,biome:'sand'}],simple={patches,regions:[{}]};const normal=terrainAt(simple,0,0).speed;simple.sandstorm=sandWeather(23);assert.equal(terrainAt(simple,0,0).speed,normal);assert(terrainAt(simple,10,0).speed<normal);
});
test('new map victory persists alongside existing expedition records',()=>{
 const j={relics:['wind'],wins:['forest:rifle']},memory=new Map(),storage={setItem:(k,v)=>memory.set(k,v),getItem:k=>memory.get(k)};assert(recordVictory(j,'confluence','harpoon'));assert(!recordVictory(j,'confluence','harpoon'));assert(writeJournal(storage,j));assert.deepEqual(readJournal(storage),j);
});
import{GameAudio}from'../audio.js';
test('seamless region music changes preserve the beat and combat sounds',()=>{
 const a=new GameAudio();a.beat=32;a.next=10;let resets=0;a.reset=()=>resets++;
 a.update(.02,{map:'snow',seamless:true});assert.equal(a.map,'snow');assert.equal(a.beat,32);assert.equal(a.next,10);assert.equal(resets,0);
 a.update(.02,{map:'ash'});assert.equal(resets,1);
});

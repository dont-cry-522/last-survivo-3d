import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {MirageVFX} from '../mirage-vfx.js';
import {mirageSound,mirageSample} from '../mirage-audio.js';
import {SkillVFX} from '../skill-vfx.js';
import {MIRAGE} from '../mirage-config.js';
import {GameAudio} from '../audio.js';

function fixture(){
 const scene=new T.Scene(),v=new MirageVFX(scene,null),hero=new T.Group(),material=new T.MeshBasicMaterial({color:0x24142e}),geometry=new T.BoxGeometry(.4,1.5,.3),body=new T.Mesh(geometry,material);
 body.position.y=.85;hero.position.set(7,0,-3);hero.rotation.y=.5;hero.add(body);scene.add(hero);
 const combat={now:2,decoy:{id:1,x:7,z:-3,hp:72,maxHp:72,alive:true,born:2,expires:3.5},clouds:[],shield:{amount:0,until:0}};
 return{scene,v,hero,material,geometry,body,combat};
}

test('decoy freezes the visible actual hero pose, stays at origin, reuses geometry and never mutates source',()=>{
 const {scene,v,hero,material,geometry,body,combat}=fixture(),hidden=new T.Mesh(new T.SphereGeometry(.2),material);hidden.visible=false;hero.add(hidden);
 const source=Array.from(geometry.attributes.position.array),sourceColor=material.color.getHex();let sourceDisposed=0;geometry.addEventListener('dispose',()=>sourceDisposed++);
 v.update(combat,{x:7,z:-3},hero);assert(v.decoy.visible);assert.equal(v.snapshot.size,1);assert.deepEqual(v.decoy.position.toArray(),[7,0,-3]);
 const snapshot=v.snapshot.get(body.uuid),pose=Array.from(snapshot.geometry.attributes.position.array);assert(pose.every(Number.isFinite));assert.notEqual(snapshot.geometry,geometry);assert(!snapshot.isSkinnedMesh);
 hero.position.x=12;body.rotation.x=.5;combat.now=2.4;v.update(combat,{x:12,z:-3},hero);
 assert.deepEqual(snapshot.geometry.attributes.position.array,Float32Array.from(pose));assert.equal(v.decoy.position.x,7);assert.equal(material.color.getHex(),sourceColor);assert.equal(material.opacity,1);
 combat.decoy={...combat.decoy,id:2,x:12,born:2.4,expires:4};v.update(combat,{x:12,z:-3},hero);
 assert.equal(v.snapshot.get(body.uuid),snapshot);assert.notDeepEqual(Array.from(snapshot.geometry.attributes.position.array),pose);assert.deepEqual(Array.from(geometry.attributes.position.array),source);
 let snapshotDisposed=0;snapshot.geometry.addEventListener('dispose',()=>snapshotDisposed++);v.clear();assert.equal(snapshotDisposed,1);assert.equal(sourceDisposed,0);assert(!v.decoy.visible);assert.equal(v.snapshot.size,0);
 v.dispose();assert.equal(snapshotDisposed,1);assert.equal(sourceDisposed,0);assert.deepEqual(scene.children,[hero]);
});

test('decoy copies deformed skin pose without retaining a second live skeleton',()=>{
 const {v,hero,combat}=fixture();hero.clear();
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute([-.1,0,0,.1,0,0,0,1,0],3));geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute([0,0,0,0,0,0,0,0,0,0,0,0],4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute([1,0,0,0,1,0,0,0,1,0,0,0],4));geometry.setIndex([0,1,2]);geometry.computeVertexNormals();
 const mesh=new T.SkinnedMesh(geometry,new T.MeshBasicMaterial()),bone=new T.Bone();hero.add(mesh);mesh.add(bone);mesh.bind(new T.Skeleton([bone]));bone.position.y=.25;
 v.update(combat,{x:7,z:-3},hero);const imprint=v.snapshot.get(mesh.uuid);assert(imprint&&!imprint.isSkinnedMesh);assert.equal(imprint.geometry.attributes.skinIndex,undefined);assert(Math.abs(imprint.geometry.attributes.position.getY(2)-1.25)<1e-5);
 v.dispose();mesh.skeleton.dispose();
});

test('fog and shields match live game-time ranges, cap count and expire without stale effects',()=>{
 const {v,hero,combat}=fixture();combat.now=2.3;combat.clouds=Array.from({length:7},(_,i)=>({id:i+3,x:i*3,z:5,r:1.95,born:2,expires:4,lureRank:3}));combat.shield={amount:10,until:3};
 const before=JSON.stringify(combat);v.update(combat,{x:8,z:-2},hero);assert.equal(JSON.stringify(combat),before);assert.equal(v.clouds.length,MIRAGE.maxClouds);assert.equal(v.spores.count,16);assert.equal(v.guard.count,5);
 for(const f of v.fog){assert(f.visible);assert.equal(f.scale.x,1.95);assert.equal(f.scale.y,1.95);assert(f.material.uniforms.opacity.value<=.25);assert(!f.material.depthWrite);assert(f.position.y<.08);}
 combat.decoy.hp=0;v.update(combat,{x:8,z:-2},hero);assert(!v.decoy.visible);assert.equal(v.petals.count,0);
 combat.now=4.1;v.update(combat,{x:8,z:-2},hero);assert(v.fog.every(f=>!f.visible));assert.equal(v.guard.count,0);assert.equal(v.spores.count,0);
 v.update(null);assert(!v.group.visible);assert.equal(v.snapshot.size,0);v.dispose();
});

test('natural bloom is distinct from killed/replaced dissolve and uses bounded low ground particles',()=>{
 const scene=new T.Scene(),pool=new SkillVFX(scene,{mobile:true}),v=new MirageVFX(scene,pool);
 for(const kind of['mirageBreak','mirageBloom']){
  pool.clear();v.event({kind,x:2,z:1,r:1.7,reason:'killed'});
  if(kind==='mirageBreak'){assert.equal(pool.active.length,4);assert(pool.active.every(p=>p.shape==='smoke'));}
  else{assert(pool.active.some(p=>p.shape==='sweep'));assert(pool.active.length<=15);assert(pool.active.every(p=>p.mesh.position.y<.3));}
 }
 for(let i=0;i<120;i++){for(const kind of['mirageShot','mirageBurst','mirageHit','mirageHide','mirageDecoy','mirageDecoyHit','mirageBreak','mirageBloom','mirageReveal','mirageShield','mirageStatus'])v.event({kind,x:i%3,z:1,r:1.7,angle:i*.1});pool.update(1/60);assert(pool.active.length<=110);assert(pool.active.every(p=>p.mesh.geometry&&p.mesh.position.toArray().every(Number.isFinite)));}
 v.clear();pool.clear();assert.equal(pool.active.length,0);v.dispose();
});

test('mirage audio is short, separately gated, quiet on DOT, and respects stopped audio',()=>{
 const gates=[],calls=[],sound={allow:(key,interval)=>{gates.push([key,interval]);return true;},noise:(...args)=>calls.push(['noise',...args]),voice:(...args)=>calls.push(['voice',...args]),weapon:(...args)=>{calls.push(['weapon',...args]);return true;}};
 const signatures=new Set();for(const event of['Charge','Shot','Hit','Hide','Decoy','DecoyHit','Break','Bloom','Reveal','Shield']){
  calls.length=0;assert(mirageSound(sound,'mirage'+event));assert(calls.length>0&&calls.length<=3);signatures.add(JSON.stringify(calls));
  for(const [type,...args]of calls){if(type==='weapon'){assert.equal(args[0],'miasmalantern');assert(args[3]<=.7);continue;}const duration=type==='noise'?args[0]:args[1],volume=type==='noise'?args[1]:args[2];assert(duration>0&&duration<=.45);assert(volume<=.1);assert(args.filter(x=>typeof x==='number').every(Number.isFinite));}
 }
 assert.equal(signatures.size,10);assert.equal(new Set(gates.map(g=>g[0])).size,10);calls.length=0;assert(!mirageSound(sound,'mirageStatus'));assert(!mirageSound({...sound,allow:()=>false},'mirageBloom'));assert.equal(calls.length,0);
});

test('damp inhalation, gas spray and wet rupture are distinct deterministic samples without dominant bass',()=>{
 const rms=s=>Math.sqrt(s.reduce((a,b)=>a+b*b,0)/s.length);
 for(const rate of[22050,48000]){
  const signatures=new Set();for(const kind of['charge','shot','impact']){
   const samples=mirageSample(kind,rate);assert(samples.every(Number.isFinite));assert(samples.length<=rate*(kind==='charge'?.24:.60)&&samples.length>=rate*.16);assert(Math.abs(samples[0])<.0001&&Math.abs(samples.at(-1))<.001);assert(rms(samples)>.01);assert(Math.max(...samples.map(Math.abs))<.75);signatures.add(samples.slice(50,100).join(','));
   assert.deepEqual(samples,mirageSample(kind,rate));assert.notDeepEqual(samples,mirageSample(kind,rate,1));
   let bass=0,bassEnergy=0,energy=0;const filter=1-Math.exp(-2*Math.PI*180/rate);
   for(const v of samples){bass+=(v-bass)*filter;bassEnergy+=bass*bass;energy+=v*v;}
   assert(bassEnergy/energy<.15,'gas texture should not be dominated by low humming or chest pressure');
  }
  assert.equal(signatures.size,3);
  const charge=mirageSample('charge',rate),impact=mirageSample('impact',rate);
  assert(rms(charge.slice(0,rate*.045))<rms(charge.slice(rate*.08,rate*.14)),'inhale should swell before release');
  assert(rms(impact.slice(0,rate*.08))>rms(impact.slice(rate*.22,rate*.4))*2,'wet rupture should be brief, with a quieter corrosion tail');
 }
 assert.equal(mirageSample('mechanism',22050),null);assert.equal(mirageSample('status',22050),null);
});

test('lantern projectile is a soft collision-sized orb with smoke/petal trail and bounded burst',()=>{
 const scene=new T.Scene(),pool=new SkillVFX(scene,{mobile:true}),visual=new MirageVFX(scene,pool),orb=pool.projectile({id:'miasmalantern'});scene.add(orb);orb.updateMatrixWorld(true);
 const size=new T.Box3().setFromObject(orb).getSize(new T.Vector3());assert(size.x>.60&&size.x<.85);assert(size.y>.55&&size.y<.85);assert(size.z>.60&&size.z<.85);assert(orb.getObjectByName('miasma-orb-core'));assert(orb.children.every(m=>m.geometry!==pool.geometry.ray));
 const b={kind:'miasmalantern',mesh:orb,x:1,z:1,vx:13,vz:0,elapsed:.3,height:.9};pool.flight(b,.1);assert(pool.active.some(p=>p.shape==='smoke'));assert(pool.active.every(p=>p.shape!=='ray'));assert(pool.active.length<=2);pool.clear();
 visual.event({kind:'mirageBurst',x:1,z:1,r:2.2});assert.equal(pool.active.length,11);assert(pool.active.every(p=>!['waterArc','ray','sweep'].includes(p.shape)));assert(pool.active.every(p=>p.mesh.position.y<.3));assert(pool.active.every(p=>p.opacity<=.65));const field=pool.active.find(p=>p.shape==='veil');assert.deepEqual(field.size,[2.2,2.2,1]);
 const calls=[],sound={allow:()=>true,weapon:(...args)=>{calls.push(args);return true;}};assert(mirageSound(sound,'mirageBurst'));assert.equal(calls.length,1);assert.equal(calls[0][1],'impact');pool.clear();visual.dispose();
});

test('mirage wet bloom joins existing pause cleanup without capturing unrelated sources',()=>{
 let ended=0,stopped=0;const unrelated={stop(){throw Error('old source should remain outside new weapon tracking');}},sound={proceduralSources:new Set([unrelated]),weaponSources:new Set(),allow:()=>true};
 const create=registry=>{const source={stop(){stopped++;this.onended();},onended(){ended++;registry.delete(this);}};registry.add(source);};sound.noise=sound.voice=()=>create(sound.proceduralSources);sound.weapon=()=>{create(sound.weaponSources);return true;};
 mirageSound(sound,'mirageBloom');assert.equal(sound.weaponSources.size,2);assert(!sound.weaponSources.has(unrelated));
 for(const source of sound.weaponSources)source.stop();assert.equal(stopped,2);assert.equal(ended,2);assert.equal(sound.weaponSources.size,0);assert.deepEqual([...sound.proceduralSources],[unrelated]);
});

test('real weapon audio releases cancel only the pending inhale and pause/reset reclaim all sources',()=>{
 const sources=[],connectable=()=>({connect(){},disconnect(){}}),ctx={currentTime:1,state:'running',sampleRate:22050,
  createBuffer:()=>({copyToChannel(){}}),createGain:()=>({...connectable(),gain:{value:0}}),createStereoPanner:()=>({...connectable(),pan:{value:0}}),
  createBufferSource(){const source={...connectable(),playbackRate:{value:1},start(){},stop(){if(this.stopped)return;this.stopped=true;this.onended?.();}};sources.push(source);return source;}
 };
 const sound=new GameAudio(ctx);sound.ready=true;sound.sfx=connectable();
 assert(sound.weapon('crossbow','shot'));const unrelated=sources.at(-1);
 for(let i=0;i<3;i++){
  ctx.currentTime+=.6;assert(mirageSound(sound,'mirageCharge'));const charge=sources.at(-1);assert.equal(sound.weaponSources.size,2);
  ctx.currentTime+=.12;assert(mirageSound(sound,'mirageShot'));assert(charge.stopped);assert(!unrelated.stopped);const shot=sources.at(-1);
  ctx.currentTime+=.2;assert(mirageSound(sound,'mirageBurst'));const hit=sources.at(-1);shot.stop();hit.stop();assert.equal(sound.nodes,1);
 }
 ctx.currentTime+=.6;assert(mirageSound(sound,'mirageCharge'));sound.stopWeapons();assert.equal(sound.weaponSources.size,0);assert.equal(sound.nodes,0);
 ctx.currentTime+=.6;assert(mirageSound(sound,'mirageCharge'));sound.muted=true;assert(!mirageSound(sound,'mirageHide'));assert.equal(sound.nodes,0);sound.muted=false;
 ctx.currentTime+=.6;assert(mirageSound(sound,'mirageCharge'));sound.reset('forest');assert.equal(sound.weaponSources.size,0);assert.equal(sound.nodes,0);assert.equal(sound.cooldowns.size,0);
 assert(sources.every(s=>s.stopped));assert.equal(sound.weaponBuffers.size,4);
});

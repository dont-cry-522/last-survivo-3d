import{test}from'node:test';
import assert from'node:assert/strict';
import*as T from'../vendor/three.module.js';
import{SkillVFX}from'../skill-vfx.js';
import{WEAPONS,WEAPON_PATHS,weaponStats}from'../rules.js';

test('elemental impacts have a readable core and distinct secondary shapes',()=>{
 const vfx=new SkillVFX(new T.Scene(),{mobile:true});
 for(const [name,cast,shapes]of [
  ['fire',()=>vfx.fire(0,0,2,true),['flame','veil']],
  ['ice',()=>vfx.ice(0,0,5),['crystal','ray','veil']],
  ['storm',()=>vfx.lightning(0,0,2,1,true),['ray','ember']],
  ['dark',()=>vfx.dark(0,0,2,true),['crystal','veil']]
 ]){
  vfx.clear();cast();for(const shape of shapes)assert(vfx.active.some(p=>p.shape===shape),`${name} lacks ${shape}`);
  assert(!vfx.active.some(p=>['ring','disc'].includes(p.shape)),name+' must not draw hard-edged circles');
  assert(vfx.active.length<=vfx.limit);for(const p of vfx.active){assert(p.life>0&&p.life<=1);assert(p.mesh.position.toArray().every(Number.isFinite));}
 }
 for(let i=0;i<90;i++)vfx.update(1/60);assert.equal(vfx.active.length,0);
});
test('ordinary fire and dark hits do not draw range circles',()=>{const vfx=new SkillVFX(new T.Scene());vfx.fire(0,0,1);vfx.dark(0,0,1);assert(!vfx.active.some(p=>p.shape==='ring'));});
test('new weapon contacts keep distinct small silhouettes and remain pooled during a melee crowd',()=>{
 const v=new SkillVFX(new T.Scene(),{mobile:true});for(const kind of ['shield','hammer','harpoon','boomerang']){v.clear();v.weaponContact(kind,0,0,.4,2);assert(v.active.some(p=>p.shape===(kind==='shield'?'crystal':kind==='hammer'?'stone':'sweep')));assert(!v.active.some(p=>['ring','disc'].includes(p.shape)));}
 for(let i=0;i<600;i++){for(const kind of ['shield','hammer','harpoon','boomerang'])v.weaponContact(kind,0,0,.4,2);v.update(1/60);assert(v.active.length+v.pool.length<=110);}v.update(2);assert.equal(v.active.length,0);
});
test('erupting ice stays rooted and grows before sinking without a spawn-frame pop',()=>{
 const v=new SkillVFX(new T.Scene());v.ice(0,0,4);const p=v.active.find(p=>p.shape==='shard'),base=p.mesh.position.clone(),start=p.mesh.scale.y;
 const positions=p.mesh.geometry.getAttribute('position');for(let i=0;i<positions.count;i++)assert(positions.getY(i)>=0,'geometry must grow from its base');
 v.update(p.max*.25);const peak=p.mesh.scale.y;assert(peak>start*10);assert(p.mesh.position.equals(base));v.update(p.max*.6);assert(p.mesh.scale.y<peak*.5);assert(p.mesh.position.equals(base));v.update(1);assert.equal(v.active.length,0);
});
test('reused meshes reset faceted shading, texture, rotation and erupt animation',()=>{
 const v=new SkillVFX(new T.Scene());const old=v.particle('shard',0xffffff,0,0,0,{motion:'erupt',size:[1,2,1],spin:4});assert(old.material.vertexColors);old.rotation.set(1,2,3);v.clear();
 const reused=v.particle('ember',0xff0000,2,3,4,{size:[1,1,1]});assert.equal(old,reused);assert.equal(reused.material.vertexColors,false);assert.equal(reused.material.map,null);assert.deepEqual(reused.rotation.toArray().slice(0,3),[0,0,0]);v.update(.1);assert.equal(reused.scale.x,reused.scale.y);assert.equal(v.active[0].motion,'');
});
test('lightning cores remain visible through a full mobile elemental combo',()=>{const vfx=new SkillVFX(new T.Scene(),{mobile:true});vfx.ice(0,0,5);for(let i=0;i<5;i++)vfx.lightning(i*2,0,(i+1)*2,0,i===0);assert(vfx.active.length<=vfx.limit);assert(vfx.active.filter(p=>p.shape==='ray'&&p.mesh.material.color.getHex()===0xe1f4ff).length>=35,'some lightning cores disappeared at the particle cap');});
test('mobile effects expire and reuse their pool through three minutes of casting',()=>{const scene=new T.Scene(),vfx=new SkillVFX(scene,{mobile:true});for(let frame=0;frame<10800;frame++){if(frame%36===0)vfx.fire(0,0,2,true);if(frame%47===0)vfx.ice(0,0,5);if(frame%23===0)vfx.lightning(0,0,2,1,true);if(frame%29===0)vfx.dark(0,0,2,true);vfx.update(1/60);assert(vfx.active.length<=vfx.limit);assert.equal(scene.children.length,vfx.active.length);assert(vfx.active.length+vfx.pool.length<=vfx.limit);}for(let frame=0;frame<90;frame++)vfx.update(1/60);assert.equal(vfx.active.length,0);assert.equal(scene.children.length,0);});


test('directional blade impacts and shadow spells stay bounded and expire on mobile',()=>{
 const scene=new T.Scene(),vfx=new SkillVFX(scene,{mobile:true});
 for(let frame=0;frame<900;frame++){
  if(frame%15===0){vfx.bladeImpact(0,0,.7,true);vfx.bladeImpact(2,1,-.4,false);}
  if(frame%90===0){vfx.shadowSpell('veil',0,0);vfx.shadowSpell('chain',0,0,[{x:3,z:2},{x:-2,z:4},{x:1,z:-4}]);vfx.riftCast(0,2,3,.8,true);}
  vfx.update(1/60);assert(vfx.active.length<=110);assert(vfx.pool.length+vfx.active.length<=110);
  for(const p of vfx.active){assert(p.mesh.matrix.elements.every(Number.isFinite));assert(p.mesh.position.toArray().every(Number.isFinite));}
 }
 for(let i=0;i<180;i++)vfx.update(1/60);assert.equal(scene.children.length,0);
});

test('new hero skill effects stay bounded, finite and free of hard circles',()=>{const scene=new T.Scene(),vfx=new SkillVFX(scene,{mobile:true});const kinds=['faultAim','surgeAim','faultPrime','snareMark','saltWake','fault','landing','reprisal','surge','wake','brine','brineMark','briarSet','briarIdle','briar','bond','care','mine','mineBlast','counter','slug','slugHit','volley','rainAim','rain','trail','pursuit','echo','echoHit','soul','spikeAim','spikes'];for(let frame=0;frame<600;frame++){if(frame%15===0)for(const kind of kinds)vfx.skill({kind,x:0,z:0,x2:3,z2:4,angle:.4,armed:true});vfx.update(1/60);assert(vfx.active.length+vfx.pool.length<=110);for(const p of vfx.active){assert(p.mesh.position.toArray().every(Number.isFinite));assert(!['ring','disc'].includes(p.shape));}}for(let i=0;i<180;i++)vfx.update(1/60);assert.equal(vfx.active.length,0);assert.equal(scene.children.length,0);});


test('pair feedback is visible individually and charged stone and claws differ from baseline',()=>{
 const v=new SkillVFX(new T.Scene(),{mobile:true});for(const kind of ['faultAim','surgeAim','faultPrime','snareMark','saltWake']){v.clear();v.skill({kind,x:0,z:0,angle:.2,delay:.26});assert(v.active.length>0,kind);assert(v.active.some(p=>p.priority===1));v.update(1);assert.equal(v.active.length,0);}
 v.skill({kind:'fault',x:0,z:0});const height=v.active.find(p=>p.shape==='stone').size[1];v.clear();v.skill({kind:'fault',x:0,z:0,charged:true});assert(v.active.find(p=>p.shape==='stone').size[1]>height);
 v.clear();v.skill({kind:'bond',x:0,z:0,linked:true});assert(v.active.some(p=>p.shape==='crystal'));assert(v.active.some(p=>p.priority===1));
});

test('gun contacts distinguish hard fragments from soft puffs and stay within the mobile pool',()=>{
 const v=new SkillVFX(new T.Scene(),{mobile:true});
 for(const [texture,shape]of [['stone','stone'],['wood','crystal'],['ice','crystal'],['wet','smoke'],['growl','smoke']]){v.clear();v.enemyContact(texture,0x99aa88,1,2,.5,true);assert(v.active.some(p=>p.shape===shape));assert(!v.active.some(p=>p.shape==='waterArc'));assert(v.active.every(p=>p.max<=.24));}
 for(let i=0;i<180;i++){for(let j=0;j<10;j++)v.enemyContact('stone',0xaabbcc,0,0,0,true);v.update(1/60);assert(v.active.length+v.pool.length<=110);}v.update(1);assert.equal(v.active.length,0);
});

test('projectiles retain shared geometry and materials while ranged paths have distinct compact silhouettes',()=>{
 const v=new SkillVFX(new T.Scene()),variants=new Map();
 for(const pathId of [null,...Object.keys(WEAPON_PATHS)]){
  const ids=pathId?[WEAPON_PATHS[pathId].weapon]:Object.keys(WEAPONS);
  for(const id of ids){
   const w={...weaponStats({weaponId:id,weaponPath:pathId?{id:pathId,rank:3}:null}),pathId,pathRank:pathId?3:0},a=v.projectile(w),b=v.projectile(w),parts=[],copies=[];
   a.updateMatrixWorld(true);a.traverse(m=>{assert(m.matrixWorld.elements.every(Number.isFinite),id);if(m.isMesh)parts.push(m);});b.traverse(m=>{if(m.isMesh)copies.push(m);});assert(parts.length>0,id);
   if(id!=='boomerang')for(let i=0;i<parts.length;i++){assert.equal(parts[i].geometry,copies[i].geometry);assert.equal(parts[i].material,copies[i].material);}
   if(['rifle','shotgun'].includes(id)){const box=new T.Box3().setFromObject(a),size=box.getSize(new T.Vector3());assert(size.x<=w.hitRadius*2&&size.y<=w.hitRadius*2,id+' suggests a wider collision');}
   if(pathId){const signature=parts.map(m=>[m.geometry.type,m.material.color.getHex(),...m.scale.toArray(),...m.position.toArray()]);if(!variants.has(id))variants.set(id,[]);variants.get(id).push(signature);}
  }
 }
 for(const id of ['rifle','shotgun','fire','crossbow','shuriken','dark','shade','shadowblade'])assert.notDeepEqual(...variants.get(id),id+' paths should differ without widening the hitbox');
});

test('weapon launch and flight effects remain sparse and reuse the mobile and desktop pool',()=>{
 for(const mobile of [true,false]){
  const scene=new T.Scene(),v=new SkillVFX(scene,{mobile}),shots=Object.entries(WEAPON_PATHS).map(([pathId,{weapon}])=>{
   const w={...weaponStats({weaponId:weapon,weaponPath:{id:pathId,rank:3}}),pathId,pathRank:3};return {w,b:{mesh:v.projectile(w),kind:weapon,pathId,pathRank:3,x:1,z:2,vx:12,vz:8,height:weapon==='boomerang'?.7:1.15,trail:0,elapsed:0}};
  });
  for(const {w,b}of shots){v.clear();v.muzzle(w,1,2,.4);assert(v.active.length<=3,w.id+' launch is too busy');v.clear();v.flight(b,1/60);assert(v.active.length<=2,w.id+' trail is too busy');assert(v.active.every(p=>p.max<=.3));}
  v.clear();
  for(let frame=0;frame<600;frame++){
   for(const {w,b}of shots){if(frame%18===0)v.muzzle(w,1,2,.4);b.elapsed+=1/60;b.returning=frame%120>60;v.flight(b,1/60);}
   v.update(1/60);assert(v.active.length+v.pool.length<=v.limit);assert.equal(scene.children.length,v.active.length);
   for(const p of v.active){assert(p.mesh.position.toArray().every(Number.isFinite));assert(p.mesh.quaternion.toArray().every(Number.isFinite));assert(!['ring','disc','waterArc'].includes(p.shape));}
  }
  v.update(1);assert.equal(v.active.length,0);assert.equal(scene.children.length,0);
 }
});

test('harpoon and returning bone fragments follow the strike direction',()=>{
 const v=new SkillVFX(new T.Scene());
 for(const kind of ['harpoon','boomerang'])for(const combo of [0,2]){
  v.weaponContact(kind,0,0,0,combo);const front=v.active.filter(p=>p.shape==='crystal').map(p=>[...p.velocity]);v.clear();
  v.weaponContact(kind,0,0,Math.PI/2,combo);const right=v.active.filter(p=>p.shape==='crystal');
  for(let i=0;i<front.length;i++){assert(Math.abs(right[i].velocity[0]-front[i][2])<1e-8);assert(Math.abs(right[i].velocity[2]+front[i][0])<1e-8);}v.clear();
 }
});

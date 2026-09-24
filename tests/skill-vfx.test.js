import{test}from'node:test';
import assert from'node:assert/strict';
import*as T from'../vendor/three.module.js';
import{SkillVFX}from'../skill-vfx.js';

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

test('new hero skill effects stay bounded, finite and free of hard circles',()=>{const scene=new T.Scene(),vfx=new SkillVFX(scene,{mobile:true});const kinds=['mine','mineBlast','counter','slug','slugHit','volley','rainAim','rain','trail','pursuit','echo','echoHit','soul','spikeAim','spikes'];for(let frame=0;frame<600;frame++){if(frame%15===0)for(const kind of kinds)vfx.skill({kind,x:0,z:0,x2:3,z2:4,angle:.4,armed:true});vfx.update(1/60);assert(vfx.active.length+vfx.pool.length<=110);for(const p of vfx.active){assert(p.mesh.position.toArray().every(Number.isFinite));assert(!['ring','disc'].includes(p.shape));}}for(let i=0;i<180;i++)vfx.update(1/60);assert.equal(vfx.active.length,0);assert.equal(scene.children.length,0);});

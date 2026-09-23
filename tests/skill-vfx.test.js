import{test}from'node:test';
import assert from'node:assert/strict';
import*as T from'../vendor/three.module.js';
import{SkillVFX}from'../skill-vfx.js';

test('elemental impacts have a readable core and distinct secondary shapes',()=>{
 const vfx=new SkillVFX(new T.Scene(),{mobile:true});
 for(const [name,cast,shapes]of [
  ['fire',()=>vfx.fire(0,0,2,true),['flame','ring']],
  ['ice',()=>vfx.ice(0,0,5),['crystal','ring']],
  ['storm',()=>vfx.lightning(0,0,2,1,true),['ray','ring']],
  ['dark',()=>vfx.dark(0,0,2,true),['ember','disc','ring']]
 ]){
  vfx.clear();cast();for(const shape of shapes)assert(vfx.active.some(p=>p.shape===shape),`${name} lacks ${shape}`);
  assert(vfx.active.length<=vfx.limit);for(const p of vfx.active){assert(p.life>0&&p.life<=1);assert(p.mesh.position.toArray().every(Number.isFinite));}
 }
 for(let i=0;i<90;i++)vfx.update(1/60);assert.equal(vfx.active.length,0);
});
test('ordinary fire and dark hits do not draw range circles',()=>{const vfx=new SkillVFX(new T.Scene());vfx.fire(0,0,1);vfx.dark(0,0,1);assert(!vfx.active.some(p=>p.shape==='ring'));});
test('lightning cores remain visible through a full mobile elemental combo',()=>{const vfx=new SkillVFX(new T.Scene(),{mobile:true});vfx.ice(0,0,5);for(let i=0;i<5;i++)vfx.lightning(i*2,0,(i+1)*2,0,i===0);assert(vfx.active.length<=vfx.limit);assert(vfx.active.filter(p=>p.shape==='ray'&&p.mesh.material.color.getHex()===0xe1f4ff).length>=35,'some lightning cores disappeared at the particle cap');});
test('mobile effects expire and reuse their pool through three minutes of casting',()=>{const scene=new T.Scene(),vfx=new SkillVFX(scene,{mobile:true});for(let frame=0;frame<10800;frame++){if(frame%36===0)vfx.fire(0,0,2,true);if(frame%47===0)vfx.ice(0,0,5);if(frame%23===0)vfx.lightning(0,0,2,1,true);if(frame%29===0)vfx.dark(0,0,2,true);vfx.update(1/60);assert(vfx.active.length<=vfx.limit);assert.equal(scene.children.length,vfx.active.length);assert(vfx.active.length+vfx.pool.length<=vfx.limit);}for(let frame=0;frame<90;frame++)vfx.update(1/60);assert.equal(vfx.active.length,0);assert.equal(scene.children.length,0);});

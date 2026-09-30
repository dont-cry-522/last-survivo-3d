import{test}from'node:test';import assert from'node:assert/strict';
import{buildWorld,clearAt}from'../world.js';
import{terrainAt}from'../water.js';
import{advanceDiscovery,animateDiscoveries,discoveryHint}from'../map-discoveries.js';
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){}})})};
const ids=['forest','snow','ash','sand','coast'];
function dispose(w){w.group.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.userData.ownedGeometry)o.geometry.dispose();});}
const node=id=>({id,x:0,z:0,phase:0,availableAt:10,discovered:false,claimed:false,progress:0,nodes:id==='snow'?[{x:-1.25,z:0},{x:1.25,z:0}]:[]});
const visit=(n,time=10,options={})=>advanceDiscovery(n,.5,{time,player:{x:0,z:0},...options});
test('all five maps place five staggered, clear discoveries with shared geometry and shore-bound shells',()=>{
 for(const id of ids){let geometry;for(let seed=1;seed<=20;seed++){
  const w=buildWorld(id,seed);assert.equal(w.discoveries.length,5,id+' seed '+seed);
  for(const [i,n]of w.discoveries.entries()){
   assert.equal(n.availableAt,10+i*35);if(i>=3)assert(Math.hypot(n.x-w.spawn.x,n.z-w.spawn.z)>=55,'late discovery must reward outer exploration');assert.equal(n.mesh.visible,false);assert(n.mesh.children.length<=3);
   assert(clearAt(w,n.x,n.z,1.8));for(const p of n.nodes)assert(clearAt(w,p.x,p.z,.55));
   assert(w.sites.every(s=>Math.hypot(n.x-s.x,n.z-s.z)>=11));
   const g=n.mesh.children[0].geometry;assert(g.attributes.position.count>0);assert([...g.attributes.position.array].every(Number.isFinite));if(geometry)assert.strictEqual(g,geometry);geometry=g;
   if(id==='coast'){assert.equal(terrainAt(w,n.x,n.z).depth,0,'shells must sit on dry shore, away from crossing lanes');assert(w.ponds.some(p=>{const a=p.angle||0,dx=n.x-p.x,dz=n.z-p.z;return Math.abs(Math.hypot((Math.cos(a)*dx-Math.sin(a)*dz)/(p.baseRx*1.19+1.8),(Math.sin(a)*dx+Math.cos(a)*dz)/(p.baseRz*1.19+1.8))-1)<.001;}));}
  }dispose(w);
 }}
});
test('discoveries can be reached from spawn without crossing solid obstacles',()=>{
 for(const id of ids){const w=buildWorld(id,37),bound=w.half-1,size=bound*2+1,cell=(x,z)=>[Math.round(x+bound),Math.round(z+bound)],start=cell(w.spawn.x,w.spawn.z),seen=new Set([start.join(',')]),queue=[start];
  for(let i=0;i<queue.length;i++){const[x,z]=queue[i];for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=nx+','+nz;if(nx<0||nz<0||nx>=size||nz>=size||seen.has(k)||!clearAt(w,nx-bound,nz-bound,.45))continue;seen.add(k);queue.push([nx,nz]);}}
  for(const n of w.discoveries)for(const p of[n,...n.nodes])assert(seen.has(cell(p.x,p.z).join(',')),id+' inaccessible discovery');dispose(w);
 }
});
test('reveal is time and distance gated, enemy presence blocks collection, rewards occur once',()=>{
 const n=node('forest');assert(!visit(n,9).found);assert(!visit(n,10,{player:{x:10,z:0}}).found);assert(visit(n,10,{contested:true}).found);assert(!n.claimed);assert(visit(n).complete);assert(!visit(n).complete);
 const paused=node('forest');assert(!advanceDiscovery(paused,0,{time:20,player:{x:0,z:0}}).found);
});
test('snow requires both crystals; progress survives leaving or combat',()=>{
 const n=node('snow');assert(!visit(n).complete);visit(n,10,{player:{x:-1.25,z:0}});assert.equal(n.progress,1);visit(n,10,{player:{x:1.25,z:0},contested:true});assert.equal(n.progress,1);assert(visit(n,10,{player:{x:1.25,z:0}}).complete);
});
test('ash cool periods and coast low tide gate collection without charging hidden timers',()=>{
 const n=node('ash');assert(!visit(n,14).complete);assert(n.blocked);assert.match(discoveryHint(n),/灼热/);assert(visit(n,16).complete);
 const c=node('coast');assert(!visit(c,10,{tide:{warning:true}}).complete);assert(!visit(c,10,{tide:{high:true}}).complete);assert(visit(c,10,{tide:{high:false}}).complete);
});
test('sand clearing pauses in storms and combat, retains progress on leaving, completes once',()=>{
 const n=node('sand');visit(n);assert.equal(n.progress,.5);visit(n,10,{sandstorm:{active:true}});visit(n,10,{sandstorm:{warning:true}});visit(n,10,{contested:true});visit(n,10,{player:{x:10,z:0}});assert.equal(n.progress,.5);for(let i=0;i<3;i++)assert(!visit(n).complete);assert(visit(n).complete);assert(!visit(n).complete);
});
test('collected scenery remains, reward markers disappear and new runs reset discovery state',()=>{
 const w=buildWorld('forest',41),n=w.discoveries[0];n.discovered=n.claimed=true;animateDiscoveries(w,20);assert(n.mesh.visible);assert(n.markers.every(m=>!m.visible));const fresh=buildWorld('forest',41);assert(!fresh.discoveries[0].claimed);assert.equal(fresh.discoveries[0].x,n.x);dispose(w);dispose(fresh);
});

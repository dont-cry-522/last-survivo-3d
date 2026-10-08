import * as T from './vendor/three.module.js';
import{MAP_HALF}from'./map-layout.js?v=91';
export const TERRAIN_TIPS={
 forest:'浅色裂口的枯木可以打倒。倒木短暂挡路约 8 秒，追来的怪物也会破坏它；从两端绕行，不能永久堵怪。',
 snow:'浅蓝裂纹冰面会保留一点滑行惯性，人和地面怪物都会滑。提前转向、借冰面拉开距离；离开冰面立即恢复普通移动。',
 ash:'地火喷发前会冒烟并发出低鸣，提前 1.25 秒预告。把怪物引进裂隙后撤开，喷发会同时伤害双方，重型首领受到较少伤害。',
 sand:'有深色裂纹的残墙可以打碎，也能挡住怪物的远程投射。受击后逐渐破损，不能一直躲在墙后；从缺口穿行。',
 coast:'岸边断续石块连成退潮浅滩。退潮时走浅滩更快，涨潮前有 3 秒提示；涨潮淹没石路后恢复深水，附近栈桥始终可通行。'
};
const geometries=new Map(),materials=new Map();
export function terrainMesh(parent,kind,args,color,x=0,y=0,z=0){const key=kind+args.join(',');if(!geometries.has(key))geometries.set(key,new T[kind](...args));if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.94}));const m=new T.Mesh(geometries.get(key),materials.get(color));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
export function installTactics(w,id,rnd){
 w.breakables=[];w.ice=[];w.fords=[];
 if(id==='forest')for(const o of [...w.obstacles].sort((a,b)=>Math.hypot(a.x-w.spawn.x,a.z-w.spawn.z)-Math.hypot(b.x-w.spawn.x,b.z-w.spawn.z))){
  if(w.breakables.length>=6)break;if(w.breakables.some(b=>Math.hypot(b.x-o.x,b.z-o.z)<11))continue;
  w.foliage=w.foliage.filter(f=>f.leaf.parent!==o.mesh);o.mesh.clear();terrainMesh(o.mesh,'CylinderGeometry',[.17,.36,3.4,7],0x75664c,0,1.7,0);
  for(const s of[-1,1]){const branch=terrainMesh(o.mesh,'CylinderGeometry',[.04,.12,1.1,5],0x8f7b58,s*.36,2+s*.3,0);branch.rotation.z=s*.75;}
  const crack=terrainMesh(o.mesh,'BoxGeometry',[.06,.85,.04],0xe4c38b,.04,.6,.29);crack.rotation.z=.18;
  Object.assign(o,{tactic:'timber',hp:42,state:'standing',age:0});w.breakables.push(o);
 }
 if(id==='sand')for(const o of w.obstacles.filter(o=>o.mesh.userData.fragile).slice(0,16)){
  Object.assign(o,{tactic:'wall',hp:90,state:'standing',age:0});w.breakables.push(o);
  for(const s of[-1,1]){const crack=terrainMesh(o.mesh,'BoxGeometry',[.035,.55,.03],0x615c50,s*.11,.5,.44);crack.rotation.z=s*.5;}
 }
 if(id==='snow')for(let i=0;i<3;i++)for(let attempt=0;attempt<450;attempt++){
  const angle=rnd()*Math.PI*2,d=18+i*15+rnd()*8,r=2.7+rnd()*.8,x=w.spawn.x+Math.sin(angle)*d,z=w.spawn.z+Math.cos(angle)*d;
  if((w.contains&&!w.contains(x,z))||Math.abs(x)>(w.half||MAP_HALF)-6||Math.abs(z)>(w.half||MAP_HALF)-6||w.obstacles.some(o=>Math.hypot(o.x-x,o.z-z)<r+o.r+.6)||w.sites.some(s=>Math.hypot(s.x-x,s.z-z)<r+6)||w.ponds.some(p=>Math.hypot(p.x-x,p.z-z)<p.r+r+1)||[...w.discoveries,...w.ice].some(p=>Math.hypot(p.x-x,p.z-z)<r+4))continue;
  const p={x,z,r,kind:'ice',rx:r,rz:r*.76};w.patches.push(p);
  const g=new T.Group();g.position.set(p.x,.07,p.z);g.scale.set(p.r,1,p.r*.76);w.group.add(g);const surface=terrainMesh(g,'CircleGeometry',[1,15],0x8ab5c1);surface.rotation.x=-Math.PI/2;surface.castShadow=false;surface.material.transparent=true;surface.material.opacity=.68;surface.material.depthWrite=false;surface.material.roughness=.35;if(!surface.geometry.userData.irregular){const a=surface.geometry.attributes.position;for(let i=1;i<a.count;i++){const t=Math.atan2(a.getY(i),a.getX(i)),k=1+.1*Math.sin(t*3)+.06*Math.cos(t*5);a.setXY(i,a.getX(i)*k,a.getY(i)*k);}a.needsUpdate=true;surface.geometry.userData.irregular=true;}
  for(let i=0;i<5;i++){const crack=terrainMesh(g,'BoxGeometry',[.02,.009,.42],0xc0d9da,Math.sin(i*2.4)*.48,.012,Math.cos(i*2.4)*.48);crack.rotation.y=i*.9;crack.castShadow=false;}
  w.ice.push(p);break;
 }
 if(id==='coast'){
  const crossings=w.coastLayout?.fords||w.ponds.slice(0,3).map(p=>{const turn=(p.angle||0)+(p.rx>p.rz?Math.PI/2:0),offset=Math.min(6,Math.max(p.rx,p.rz)*.4);return{x:p.x+Math.sin(turn)*offset,z:p.z+Math.cos(turn)*offset,half:Math.min(p.rx,p.rz)*1.3,width:1.5,angle:turn};});
  for(const crossing of crossings){
   const f={...crossing,mesh:new T.Group()};f.mesh.position.set(f.x,0,f.z);f.mesh.rotation.y=f.angle||0;w.group.add(f.mesh);w.fords.push(f);
   for(let x=-f.half;x<=f.half;x+=1.2){const rock=terrainMesh(f.mesh,'DodecahedronGeometry',[1,0],0x6f8884,x,.1,Math.sin(x*.4)*.25+(rnd()-.5)*.16);rock.scale.set(.42+rnd()*.22,.12+rnd()*.06,.34+rnd()*.22);rock.rotation.y=rnd()*6;rock.castShadow=false;}
  }
 }
}
export const onIce=(w,x,z)=>!!w.ice?.some(p=>Math.hypot((x-p.x)/p.rx,(z-p.z)/p.rz)<1);
export const onFord=(w,x,z)=>!w.tide?.high&&!!w.fords?.some(f=>{const c=Math.cos(f.angle||0),s=Math.sin(f.angle||0),dx=x-f.x,dz=z-f.z;return Math.abs(c*dx-s*dz)<f.half&&Math.abs(s*dx+c*dz)<f.width/2;});
// Integrate the exponential velocity exactly so stopping distance is independent of frame rate.
export function iceMotion(p,vx,vz,dt,icy){
 if(!icy){p.iceVX=vx;p.iceVZ=vz;return{x:vx*dt,z:vz*dt};}
 const rate=4.8,blend=-Math.expm1(-rate*dt),ox=p.iceVX??vx,oz=p.iceVZ??vz;
 p.iceVX=ox+(vx-ox)*blend;p.iceVZ=oz+(vz-oz)*blend;
 return{x:vx*dt+(ox-vx)*blend/rate,z:vz*dt+(oz-vz)*blend/rate};
}
export function damageTerrain(o,damage,from){
 if(!o?.tactic||o.state!=='standing'||damage<=0)return false;o.hp-=damage;
 if(o.hp>0){o.mesh.scale.y=.92+.08*Math.max(0,o.hp)/(o.tactic==='wall'?90:42);return true;}
 o.state=o.tactic==='timber'?'falling':'crumbling';o.age=0;o.angle=Math.atan2(o.x-from.x,o.z-from.z);return true;
}
export function updateTactics(w,dt,{player,foes,clear,fx}){
 if(dt<=0)return;
 for(const f of w.fords||[])f.mesh.scale.y=1-(w.tide?.rise||0)*.92;
 for(const o of w.breakables||[]){
  if(o.state==='standing'){
   const near=foes.filter(e=>e.alive&&Math.hypot(e.x-o.x,e.z-o.z)<o.r+e.size+.65);
   if(near.length)damageTerrain(o,dt*near.reduce((n,e)=>n+(e.role==='golem'?22:8),0),near[0]);
  }
  if(['standing','spent'].includes(o.state))continue;o.age+=dt;
  if(o.state==='falling'){
   o.mesh.rotation.set(Math.min(1,o.age/.75)**2*Math.PI/2,o.angle,0,'YXZ');
   if(o.age>=.75){w.obstacles=w.obstacles.filter(b=>b!==o);o.state='fallen';o.age=0;
    for(let i=0;i<5;i++){const d=.35+i*.66,x=o.x+Math.sin(o.angle)*d,z=o.z+Math.cos(o.angle)*d;
     if(clear(x,z,.35)&&[player,...foes.filter(e=>e.alive)].every(p=>Math.hypot(p.x-x,p.z-z)>(p.size||.45)+.65))w.obstacles.push({x,z,r:.34,mesh:o.mesh,owner:o});
    }fx(o,'fall');
   }
  }else if(o.state==='crumbling'){
   o.mesh.scale.y=Math.max(.08,1-o.age*2);if(o.age>=.5){w.obstacles=w.obstacles.filter(b=>b!==o);o.state='spent';fx(o,'break');}
  }else if(o.state==='fallen'){
   // Contact wears fallen timber down sooner, but never extends its lifetime.
   if(foes.some(e=>e.alive&&Math.hypot(e.x-o.x,e.z-o.z)<4))o.age+=dt;
   if(o.age>=8){w.obstacles=w.obstacles.filter(b=>b.owner!==o);o.state='spent';o.mesh.position.y=-.2;fx(o,'break');}
  }
 }
}

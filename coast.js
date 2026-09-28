import * as T from './vendor/three.module.js';
const boardGeometry=new T.BoxGeometry(2.8,.12,.35),boardMaterial=new T.MeshStandardMaterial({color:0x86765b,roughness:.94}),postGeometry=new T.CylinderGeometry(.11,.14,1.1,7),postMaterial=new T.MeshStandardMaterial({color:0x635b49,roughness:1});
export function tideState(time){const p=((time%28)+28)%28,warning=p>=14&&p<17,high=p>=17&&p<25;const rise=p<17?0:p<19?(p-17)/2:p<25?1:(28-p)/3;return{warning,high,rise,label:warning?'涨潮将至':high?'涨潮 · 沿栈桥通行':'退潮 · 探索滩地'};}
export function onBridge(world,x,z){return(world.bridges||[]).some(b=>Math.abs(x-b.x)<b.width/2&&Math.abs(z-b.z)<b.length/2);}
export function installCoast(world){
 world.bridges=[];const boards=[],posts=[];
 for(const p of world.ponds){p.baseRx=p.rx;p.baseRz=p.rz;const b={x:p.x,z:p.z,width:2.8,length:Math.max(p.rx,p.rz)*2.9};world.bridges.push(b);const count=Math.ceil(b.length/.40);for(let i=0;i<count;i++)boards.push([b.x,.14,b.z-b.length/2+i*.4]);for(const s of[-1,1])for(let i=0;i<4;i++)posts.push([b.x+s*1.3,.26,b.z-b.length/2+i*b.length/3]);}
 for(const [positions,geometry,material]of[[boards,boardGeometry,boardMaterial],[posts,postGeometry,postMaterial]]){const m=new T.InstancedMesh(geometry,material,positions.length),dummy=new T.Object3D();for(let i=0;i<positions.length;i++){dummy.position.set(...positions[i]);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);}m.castShadow=m.receiveShadow=true;world.group.add(m);}
 world.obstacles=world.obstacles.filter(o=>{const blocked=world.bridges.some(b=>Math.abs(o.x-b.x)<b.width/2+o.r+.6&&Math.abs(o.z-b.z)<b.length/2+o.r+.6);if(blocked)o.mesh.removeFromParent();return !blocked;});
 world.tide=tideState(0);return world;
}
export function updateTide(world,time){if(world.weather.kind!=='coast')return;world.tide=tideState(time);for(const p of world.ponds){const k=1+.19*world.tide.rise;p.rx=p.baseRx*k;p.rz=p.baseRz*k;p.r=Math.max(p.rx,p.rz)*1.12;p.mesh.scale.set(p.rx,1,p.rz);if(p.bank)p.bank.scale.set(p.rx*1.12,1,p.rz*1.12);}}
export function harpoonHit(origin,target,angle,range,width){const x=target.x-origin.x,z=target.z-origin.z,along=x*Math.sin(angle)+z*Math.cos(angle),across=Math.abs(x*Math.cos(angle)-z*Math.sin(angle));return along>=0&&along<=range+(target.size||0)*.4&&across<width+(target.size||0)*.45;}
export function tideDashTravel(remaining){const u=Math.max(0,Math.min(1,1-remaining/.30));return 4.6*(u-Math.sin(2*Math.PI*u)/(2*Math.PI));}

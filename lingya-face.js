import * as T from './vendor/three.module.js';
import {smoothSeams} from './hero-finish.js?v=83';

const bell=(v,c,r)=>Math.exp(-(((v-c)/r)**2));
export const lingyaHeadY=y=>y-.023*T.MathUtils.smoothstep(y,1.44,1.59);

// Keep the authored face topology, sockets, lips, ears and weighted neck continuous.
export function refineLingyaHead(root){
 let face,brows;const browVertices=[];
 root.traverse(o=>{
  if(!o.isSkinnedMesh)return;
  const skin=o.material.name.includes('Superhero'),eyes=o.name==='Eyes',brow=o.name==='Eyebrows',hair=o.name==='Hair_Long',hood=o.name.includes('Head_Hood');
  if(!skin&&!eyes&&!brow&&!hair&&!hood)return;
  o.geometry=o.geometry.clone();const p=o.geometry.attributes.position,colors=[];
  for(let i=0;i<p.count;i++){
   let x=p.getX(i),y=p.getY(i),z=p.getZ(i);const ox=x,oy=y,oz=z,front=T.MathUtils.smoothstep(z,.025,.045);
   if(skin&&y>1.53){
    x*=1+.075*bell(y,1.605,.041);
    y+=.012*bell(y,1.567,.044);
    z-=.017*bell(x,0,.018)*bell(oy,1.618,.022)*front;
    z-=.004*bell(Math.abs(x),.035,.029)*bell(oy,1.674,.015)*front;
    const mouth=bell(oy,1.593,.012)*bell(x,0,.042)*front;
    x*=1-.20*mouth;z-=.008*mouth;y+=(1.593-oy)*.27*mouth;
    y+=.002*bell(Math.abs(x),.021,.010)*bell(oy,1.592,.012)*front;
   }
   if(skin||eyes||brow&&oy<1.666){
    const w=bell(Math.abs(ox),.032,.027)*bell(oy,1.655,.020)*front;
    y+=(oy-1.6535)*(eyes?.12:.70)*w;
   }
   if(hair){const covered=1-T.MathUtils.smoothstep(z,.005,.045);x*=1-.12*covered;z=-.025+(z+.025)*(1-.08*covered);y=1.67+(y-1.67)*(1-.06*covered);}
   if(brow&&oy>=1.666){y=1.679+(y-1.677)*.48-.08*(Math.abs(x)-.032);x*=.97;browVertices.push(i);}
   y=lingyaHeadY(y);p.setXYZ(i,x,y,z);
   if(skin){
    const lip=bell(oy,1.593,.006)*bell(ox,0,.022)*front,cheek=bell(oy,1.624,.017)*bell(Math.abs(ox),.052,.019)*front;
    const c=new T.Color(0xffffff).lerp(new T.Color(0xcc8c81),lip*.35).lerp(new T.Color(0xe3ada0),cheek*.16);colors.push(c.r,c.g,c.b);
   }
  }
  if(skin){o.geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));o.material.vertexColors=true;o.geometry=softenFaceSurface(o.geometry);face=o;}
  if(brow){brows=o;o.material.color.set(0x765440);o.material.roughness=.92;}
  if(eyes){o.material.roughness=.55;o.material.metalness=0;}
  o.geometry.computeVertexNormals();smoothSeams(o.geometry);o.geometry.computeBoundingBox();o.geometry.computeBoundingSphere();
 });
 // Lift the relaxed eyebrows onto the forehead rather than burying their inner ends.
 const probe=new T.Mesh(face.geometry,new T.MeshBasicMaterial({side:T.DoubleSide})),ray=new T.Raycaster(),p=brows.geometry.attributes.position;
 probe.updateMatrixWorld();
 for(const i of browVertices){
  ray.set(new T.Vector3(p.getX(i),p.getY(i),1),new T.Vector3(0,0,-1));const hit=ray.intersectObject(probe)[0];
  if(hit)p.setZ(i,hit.point.z+.0013+Math.max(0,p.getZ(i)-.06)*.07);
 }
 probe.material.dispose();brows.geometry.computeVertexNormals();smoothSeams(brows.geometry);
}

// A single Loop subdivision pass, welding position seams while retaining UV seams
// and interpolating bone influences by bone ID. Templates run this once at load.
export function softenFaceSurface(source){
 const p=source.attributes.position,ids=source.index.array,groups=[],weld=new Map(),groupOf=new Map(),edges=new Map();
 for(const i of new Set(ids)){
  const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e5)).join(',');
  if(!weld.has(key)){weld.set(key,groups.length);groups.push({at:new T.Vector3().fromBufferAttribute(p,i),near:new Set(),boundary:new Set()});}
  groupOf.set(i,weld.get(key));
 }
 const edgeKey=(a,b)=>a<b?a+','+b:b+','+a;
 for(let i=0;i<ids.length;i+=3)for(let k=0;k<3;k++){
  const a=groupOf.get(ids[i+k]),b=groupOf.get(ids[i+(k+1)%3]),c=groupOf.get(ids[i+(k+2)%3]),key=edgeKey(a,b);
  groups[a].near.add(b);groups[b].near.add(a);if(!edges.has(key))edges.set(key,{a,b,opposite:[]});edges.get(key).opposite.push(c);
 }
 for(const e of edges.values()){
  if(e.opposite.length===2)e.at=groups[e.a].at.clone().add(groups[e.b].at).multiplyScalar(3/8).addScaledVector(groups[e.opposite[0]].at,1/8).addScaledVector(groups[e.opposite[1]].at,1/8);
  else{e.at=groups[e.a].at.clone().add(groups[e.b].at).multiplyScalar(.5);groups[e.a].boundary.add(e.b);groups[e.b].boundary.add(e.a);}
 }
 for(const g of groups){
  if(g.boundary.size===2){g.refined=g.at.clone().multiplyScalar(.75);for(const i of g.boundary)g.refined.addScaledVector(groups[i].at,.125);}
  else if(g.boundary.size)g.refined=g.at.clone();
  else{const n=g.near.size,beta=n===3?3/16:3/(8*n);g.refined=g.at.clone().multiplyScalar(1-n*beta);for(const i of g.near)g.refined.addScaledVector(groups[i].at,beta);}
 }
 const data={};for(const [name,a]of Object.entries(source.attributes))if(name!=='normal'&&name!=='tangent')data[name]={size:a.itemSize,values:[]};
 let count=0;
 const vertex=(from,weights,at)=>{
  const n=count++;
  for(const [name,d]of Object.entries(data)){
   if(name==='position'){d.values.push(at.x,at.y,at.z);continue;}
   if(name==='skinIndex'||name==='skinWeight')continue;
   const a=source.attributes[name];for(let k=0;k<d.size;k++)d.values.push(from.reduce((v,i,j)=>v+a.array[i*d.size+k]*weights[j],0));
  }
  if(data.skinIndex){
   const influence=new Map(),indices=source.attributes.skinIndex,weightsIn=source.attributes.skinWeight;
   from.forEach((i,j)=>{for(let k=0;k<4;k++){const bone=indices.array[i*4+k],w=weightsIn.array[i*4+k]*weights[j];influence.set(bone,(influence.get(bone)||0)+w);}});
   const sorted=[...influence].sort((a,b)=>b[1]-a[1]).slice(0,4),total=sorted.reduce((s,v)=>s+v[1],0);
   for(let k=0;k<4;k++){data.skinIndex.values.push(sorted[k]?.[0]||0);data.skinWeight.values.push((sorted[k]?.[1]||0)/total);}
  }
  return n;
 };
 const original=new Map(),midpoints=new Map(),out=[];
 for(const i of new Set(ids))original.set(i,vertex([i],[1],groups[groupOf.get(i)].refined));
 const midpoint=(a,b)=>{const key=edgeKey(a,b);if(!midpoints.has(key))midpoints.set(key,vertex([a,b],[.5,.5],edges.get(edgeKey(groupOf.get(a),groupOf.get(b))).at));return midpoints.get(key);};
 for(let i=0;i<ids.length;i+=3){const [a,b,c]=[ids[i],ids[i+1],ids[i+2]],[ab,bc,ca]=[midpoint(a,b),midpoint(b,c),midpoint(c,a)];out.push(original.get(a),ab,ca,ab,original.get(b),bc,ca,bc,original.get(c),ab,bc,ca);}
 const result=new T.BufferGeometry();for(const [name,d]of Object.entries(data))result.setAttribute(name,name==='skinIndex'?new T.Uint16BufferAttribute(d.values,d.size):new T.Float32BufferAttribute(d.values,d.size));result.setIndex(out);result.computeVertexNormals();smoothSeams(result);return result;
}

import * as T from './vendor/three.module.js';

// Average normals at duplicated UV vertices, retaining UVs and skin weights.
export function smoothSeams(geometry){
 const p=geometry.attributes.position,n=geometry.attributes.normal,groups=new Map();
 if(!n)return;
 const used=new Set(geometry.index?geometry.index.array:Array.from({length:p.count},(_,i)=>i));
 for(const i of used){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*100000)).join(',');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(i);}
 for(const indices of groups.values()){
  const normal=new T.Vector3();for(const i of indices)normal.add(new T.Vector3().fromBufferAttribute(n,i));normal.normalize();
  for(const i of indices)n.setXYZ(i,normal.x,normal.y,normal.z);
 }
 n.needsUpdate=true;
}

export function finishHeroSurface(root,kind){
 root.traverse(o=>{
  if(!o.isMesh)return;
  const name=o.material.name||'',skin=name.includes('Superhero')||name.includes('Regular'),hair=name.includes('Hair')||o.userData.hairstyle||o.name.startsWith('Guardian_');
  // Every template receives its own surfaces; polishing one must not recolor another.
  const original=o.material;o.geometry=o.geometry.clone();o.material=original.clone();o.material.onBeforeCompile=original.onBeforeCompile;o.material.customProgramCacheKey=original.customProgramCacheKey;
  if(skin||hair)smoothSeams(o.geometry);
  const m=o.material;
  if(m.normalScale)m.normalScale.multiplyScalar(skin?.65:hair?.55:.48);
  if(kind==='scout'&&name.includes('Ranger')){
   m.color.set(0xc4cbbb);m.roughness=.83;m.metalness=/Pauldron|Bracer/.test(o.name)?.20:.04;
  }
  if(kind==='guardian'&&/Body$|Pauldron|Bracer/.test(o.name)){m.metalness=.32;m.roughness=.64;}
  if(kind==='tide'&&!skin&&!hair){m.roughness=.78;m.metalness=/Bracer|Belt/.test(o.name)?.18:.035;}
  if(kind==='lingya'&&!skin&&!hair){m.roughness=.90;m.metalness=.01;}
 });
}

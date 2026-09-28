// Retain authored skin weights, UVs and seams; give the shield bearer his own silhouette.
export function guardianOutfit(root){
 const hair=[];root.traverse(o=>{if(o.userData.hairstyle)hair.push(o);});for(const o of hair)o.removeFromParent();
 root.traverse(o=>{
  if(!o.isSkinnedMesh)return;
  if(o.material.name.includes('Ranger')){
   const name=o.name,armor=/Body$|Pauldron|Bracer/.test(name),belt=name.includes('Belt'),legs=name.includes('Legs');
   o.material=o.material.clone();o.material.color.set(0xffffff);o.material.metalness=armor?.55:belt?.38:.06;o.material.roughness=armor?.48:.87;
   const tint=armor?'.32,.40,.45':belt?'.36,.24,.10':legs?'.055,.067,.083':'.12,.085,.075';
   o.material.onBeforeCompile=s=>{s.vertexShader='varying vec3 guardianRest;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nguardianRest=position;');s.fragmentShader='varying vec3 guardianRest;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
     float grain=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
     diffuseColor.rgb=vec3(${tint})*(.48+grain*2.0);
     ${armor?"float seam=1.0-smoothstep(.004,.012,abs(guardianRest.y-1.14));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.34,.27,.15),seam*.65);":''}
   `);};o.material.customProgramCacheKey=()=> 'guardian-'+tint;
   if(!name.includes('Hood')){
    o.geometry=o.geometry.clone();const p=o.geometry.attributes.position;
    for(let i=0;i<p.count;i++){
     let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
     if(name.includes('Body')){const weight=Math.exp(-Math.pow((y-1.30)/.34,4));x*=1+.21*weight;z*=1+.18*weight;}
     else if(name.includes('Pauldron')){x=.24+(x-.24)*1.24;y=1.49+(y-1.49)*1.16;z=-.065+(z+.065)*1.2;}
     else if(name.includes('Bracer')){y=1.46+(y-1.46)*1.12;z=-.065+(z+.065)*1.12;}
     else if(legs){const center=Math.sign(x)*.09;x=center+(x-center)*1.15;z*=1.12;}
     p.setXYZ(i,x,y,z);
    }o.geometry.computeVertexNormals();o.geometry.computeBoundingBox();o.geometry.computeBoundingSphere();
   }
  }
 });
}
export function guardianHair(root,role){root.traverse(o=>{if(o.isMesh){o.name='Guardian_'+role;o.material=o.material.clone();o.material.color.set(0xffffff);o.material.roughness=.93;o.material.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 float strand=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
 diffuseColor.rgb=vec3(.19,.205,.21)*(.55+strand*1.25);
 `);};o.material.customProgramCacheKey=()=> 'guardian-salt-hair';}});}

import * as T from './vendor/three.module.js';

// Frame the equipped hero inside the selected map, leaving room for preparation UI.
export class HeroPreview {
 constructor(renderer,element){
  this.renderer=renderer;this.element=element;
  this.camera=new T.PerspectiveCamera(35,1,.1,180);
 }
 render(scene,hero,pet){
  const rect=this.element.getBoundingClientRect(),width=innerWidth,height=innerHeight;
  if(rect.width<=0||rect.height<=0)return;
  const petPosition=pet?.position.clone();
  try{
   if(pet)pet.position.set(hero.position.x+1.25,hero.position.y,hero.position.z+.1);
   scene.updateMatrixWorld(true);
   if(this.hero!==hero){
    this.hero=hero;this.bounds=new T.Box3().setFromObject(hero,true);
    if(pet)this.bounds.union(new T.Box3().setFromObject(pet,true));
   }
   const center=this.bounds.getCenter(new T.Vector3()),direction=new T.Vector3(.7,.45,.9).normalize();
   this.camera.clearViewOffset();this.camera.aspect=rect.width/rect.height;
   this.camera.position.copy(center).add(direction);this.camera.lookAt(center);this.camera.updateMatrixWorld(true);
   const right=new T.Vector3().setFromMatrixColumn(this.camera.matrixWorld,0),up=new T.Vector3().setFromMatrixColumn(this.camera.matrixWorld,1);
   const tanV=Math.tan(T.MathUtils.degToRad(this.camera.fov/2)),tanH=tanV*this.camera.aspect;
   let distance=0;
   for(const x of[this.bounds.min.x,this.bounds.max.x])for(const y of[this.bounds.min.y,this.bounds.max.y])for(const z of[this.bounds.min.z,this.bounds.max.z]){
    const p=new T.Vector3(x,y,z).sub(center),depth=p.dot(direction);
    distance=Math.max(distance,Math.abs(p.dot(right))*1.14/tanH+depth,Math.abs(p.dot(up))*1.14/tanV+depth);
   }
   this.camera.position.copy(center).addScaledVector(direction,distance);
   // Extend the portrait's view over the whole page: one continuous landscape,
   // with the hero still centered in the reserved area (including mobile scroll).
   this.camera.setViewOffset(rect.width,rect.height,-rect.left,-rect.top,width,height);
   this.camera.updateMatrixWorld(true);
   this.renderer.render(scene,this.camera);
  }finally{
   if(pet){pet.position.copy(petPosition);pet.updateMatrixWorld(true);}
  }
 }
}

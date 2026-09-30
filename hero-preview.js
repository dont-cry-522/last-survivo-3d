import * as T from './vendor/three.module.js';

// Reuse the equipped model and its idle pose, without changing combat transforms.
export class HeroPreview {
 constructor(renderer,element){
  this.renderer=renderer;this.element=element;
  this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(35,1,.1,100);
  this.scene.add(new T.HemisphereLight(0xe3eee6,0x54605a,3));
  const key=new T.DirectionalLight(0xffe8cf,3.3);key.position.set(4,7,6);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:25});key.shadow.normalBias=.025;
  const rim=new T.DirectionalLight(0x9fdccc,2.2);rim.position.set(-4,4,-3);this.scene.add(key,rim);
  this.floor=new T.Mesh(new T.PlaneGeometry(30,30),new T.ShadowMaterial({opacity:.24}));this.floor.rotation.x=-Math.PI/2;this.floor.receiveShadow=true;this.scene.add(this.floor);
 }
 render(hero,pet){
  const r=this.renderer,rect=this.element.getBoundingClientRect(),width=innerWidth,height=innerHeight;
  r.setClearColor(0x000000,0);r.clear();
  // Scrolling the mobile preparation page must not paint over the fixed header.
  const top=Math.max(rect.top,matchMedia('(pointer:coarse)').matches?60:90),bottom=Math.min(rect.bottom,height);
  if(bottom<=top||rect.width<=0)return;
  const models=[hero,...(pet?[pet]:[])],saved=models.map(model=>({model,parent:model.parent,position:model.position.clone()}));
  try{
   this.scene.add(hero);hero.position.set(0,0,0);
   if(pet){this.scene.add(pet);pet.position.set(1.25,0,.1);}
   this.scene.updateMatrixWorld(true);
   if(this.hero!==hero){
    this.hero=hero;this.bounds=new T.Box3().setFromObject(hero,true);if(pet)this.bounds.union(new T.Box3().setFromObject(pet,true));
    this.floor.position.y=this.bounds.min.y-.015;
   }
   const center=this.bounds.getCenter(new T.Vector3()),direction=new T.Vector3(.7,.22,1).normalize();
   this.camera.aspect=rect.width/rect.height;this.camera.position.copy(center).add(direction);this.camera.lookAt(center);this.camera.updateMatrixWorld(true);
   const right=new T.Vector3().setFromMatrixColumn(this.camera.matrixWorld,0),up=new T.Vector3().setFromMatrixColumn(this.camera.matrixWorld,1);
   const tanV=Math.tan(T.MathUtils.degToRad(this.camera.fov/2)),tanH=tanV*this.camera.aspect;
   let distance=0;
   for(const x of[this.bounds.min.x,this.bounds.max.x])for(const y of[this.bounds.min.y,this.bounds.max.y])for(const z of[this.bounds.min.z,this.bounds.max.z]){
    const p=new T.Vector3(x,y,z).sub(center),depth=p.dot(direction);
    distance=Math.max(distance,Math.abs(p.dot(right))*1.14/tanH+depth,Math.abs(p.dot(up))*1.14/tanV+depth);
   }
   this.camera.position.copy(center).addScaledVector(direction,distance);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld(true);
   r.setViewport(rect.left,height-rect.bottom,rect.width,rect.height);r.setScissor(Math.max(0,rect.left),height-bottom,Math.min(width,rect.right)-Math.max(0,rect.left),bottom-top);r.setScissorTest(true);
   r.render(this.scene,this.camera);
  }finally{
   for(const {model,parent,position}of saved){parent.add(model);model.position.copy(position);model.updateMatrixWorld(true);}
   r.setScissorTest(false);r.setViewport(0,0,width,height);
  }
 }
}

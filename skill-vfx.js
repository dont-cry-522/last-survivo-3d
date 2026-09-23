import * as T from './vendor/three.module.js';

function flameTexture(){
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=64;canvas.height=128;const c=canvas.getContext('2d');
 const gradient=c.createLinearGradient(0,0,0,128);gradient.addColorStop(0,'rgba(255,255,255,0)');gradient.addColorStop(.2,'rgba(255,255,255,.4)');gradient.addColorStop(.5,'rgba(255,255,255,1)');gradient.addColorStop(.85,'rgba(255,255,255,.9)');gradient.addColorStop(1,'rgba(255,255,255,0)');
 c.fillStyle=gradient;c.beginPath();c.moveTo(31,3);c.bezierCurveTo(17,43,58,53,53,85);c.bezierCurveTo(53,119,13,127,9,92);c.bezierCurveTo(3,68,28,47,31,3);c.fill();const texture=new T.CanvasTexture(canvas);return texture;
}

// A bounded mesh pool keeps spell bursts cheap and reuses both geometry and materials.
export class SkillVFX{
 constructor(scene,{mobile=false}={}){
  this.scene=scene;this.limit=mobile?110:190;this.active=[];this.pool=[];this.materials=new Map();
  this.flameTexture=flameTexture();this.geometry={ember:new T.IcosahedronGeometry(1,0),crystal:new T.ConeGeometry(1,2,5),flame:new T.PlaneGeometry(2,2),smoke:new T.SphereGeometry(1,7,5),ray:new T.BoxGeometry(1,1,1)};
 }
 particle(shape,color,x,y,z,{life=.4,size=[.1,.1,.1],velocity=[0,0,0],opacity=.9,additive=true,grow=false,gravity=0,spin=0}={}){
  if(this.active.length>=this.limit)return null;
  const mesh=this.pool.pop()||new T.Mesh(this.geometry.ember,new T.MeshBasicMaterial({transparent:true,depthWrite:false,side:T.DoubleSide}));
  mesh.geometry=this.geometry[shape];mesh.material.color.set(color);mesh.material.opacity=opacity;mesh.material.blending=additive?T.AdditiveBlending:T.NormalBlending;
  const map=shape==='flame'?this.flameTexture:null;if(mesh.material.map!==map){mesh.material.map=map;mesh.material.needsUpdate=true;}
  mesh.position.set(x,y,z);mesh.rotation.set(0,shape==='flame'?Math.PI/4:0,0);mesh.scale.set(...size);mesh.visible=true;mesh.frustumCulled=false;this.scene.add(mesh);
  const p={mesh,shape,life,max:life,size,velocity,opacity,grow,gravity,spin};this.active.push(p);return mesh;
 }
 update(dt){
  let n=0;for(const p of this.active){p.life-=dt;if(p.life<=0){this.scene.remove(p.mesh);this.pool.push(p.mesh);continue;}
   const progress=1-p.life/p.max,fade=Math.min(1,(1-progress)*3),scale=p.grow?Math.sin(Math.PI*Math.min(.99,progress+.05)):.9+progress*.25;
   p.mesh.material.opacity=p.opacity*fade;p.mesh.scale.set(p.size[0]*scale,p.size[1]*scale,p.size[2]*scale);
   if(p.shape==='flame'){p.mesh.rotation.z=Math.sin(progress*9+p.mesh.position.x)*.09;p.mesh.scale.x*=.85+Math.sin(progress*16)*.15;}
   p.velocity[1]-=p.gravity*dt;p.mesh.position.x+=p.velocity[0]*dt;p.mesh.position.y+=p.velocity[1]*dt;p.mesh.position.z+=p.velocity[2]*dt;p.mesh.rotation.y+=p.spin*dt;this.active[n++]=p;
  }this.active.length=n;
 }
 clear(){for(const p of this.active){this.scene.remove(p.mesh);this.pool.push(p.mesh);}this.active.length=0;}
 fire(x,z,r=2,large=false){
  const count=large?16:7;
  for(let i=0;i<count;i++){const a=i/count*Math.PI*2,d=(.18+Math.random()*.48)*r,h=(large?.8:.45)+Math.random()*.6;
   this.particle('flame',i%3?0xff6829:0xffc96a,x+Math.cos(a)*d,.45,z+Math.sin(a)*d,{life:.4+Math.random()*.25,size:[large?.45:.28,h,.3],velocity:[Math.cos(a)*.35,1.1,Math.sin(a)*.35],grow:true,additive:false,opacity:.9});
   if(i%2===0)this.particle('ember',0xffce72,x,.5,z,{life:.4,size:[.045,.065,.045],velocity:[Math.cos(a)*r*2,2+Math.random(),Math.sin(a)*r*2],gravity:5,spin:8});
  }
  if(large)for(let i=0;i<4;i++)this.particle('smoke',0x74665f,x+(Math.random()-.5)*r,.5,z+(Math.random()-.5)*r,{life:.75,size:[.35,.45,.35],velocity:[0,1,0],additive:false,opacity:.22});
 }
 meteor(x,z){
  const m=this.particle('ember',0xffaa51,x-2.5,7,z-1.5,{life:.5,size:[.38,.62,.38],velocity:[5,-13,3],spin:5});if(m)m.rotation.z=.35;
  for(let i=1;i<=5;i++)this.particle('crystal',i%2?0xff7a28:0xffdca1,x-2.5-i*.12,7+i*.22,z-1.5-i*.08,{life:.5,size:[.22-i*.025,.45,.22-i*.025],velocity:[5,-13,3],opacity:.7});
 }
 ice(x,z,r=5){
  for(let i=0;i<22;i++){const a=i/22*Math.PI*2,d=r*(.3+.65*(i%3)/2),h=.4+Math.random()*.65;
   const m=this.particle('crystal',i%3?0x48b7e5:0xb7edff,x+Math.cos(a)*d,.3,z+Math.sin(a)*d,{life:.55+Math.random()*.25,size:[.20,h,.20],opacity:.88,grow:true,additive:false});if(m){m.rotation.z=Math.cos(a)*.28;m.rotation.x=Math.sin(a)*.28;}
   if(i%2===0)this.particle('ember',0xc0f4ff,x,.3,z,{life:.42,size:[.055,.10,.055],velocity:[Math.cos(a)*r*2,.35,Math.sin(a)*r*2],spin:8});
  }
 }
 segment(a,b,color,width,life=.15){const delta=new T.Vector3().subVectors(b,a),mid=new T.Vector3().addVectors(a,b).multiplyScalar(.5),m=this.particle('ray',color,mid.x,mid.y,mid.z,{life,size:[width,delta.length(),width],additive:width<.04});if(m)m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());}
 lightning(ax,az,bx,bz,vertical=false){
  const start=new T.Vector3(ax,vertical?6:1.1,az),end=new T.Vector3(bx,1,bz);let last=start;
  for(let i=1;i<=7;i++){const t=i/7,next=new T.Vector3().lerpVectors(start,end,t);if(i<7){next.x+=(Math.random()-.5)*.55;next.y+=(Math.random()-.5)*.25;next.z+=(Math.random()-.5)*.55;}
   this.segment(last,next,0x548dff,.055,.2);this.segment(last,next,0xe1f4ff,.018,.13);
   if(i===3||i===5)this.segment(next,next.clone().add(new T.Vector3(.35,.15,-.2)),0x92bfff,.023,.12);last=next;
  }
  for(let i=0;i<4;i++)this.particle('ember',0xb5d9ff,bx,1,bz,{life:.2,size:[.055,.035,.055],velocity:[(Math.random()-.5)*3,Math.random()*2,(Math.random()-.5)*3]});
 }
 dark(x,z,r=2){for(let i=0;i<8;i++){const a=i*Math.PI/4,d=r*.6;this.particle('ember',i%2?0x9d6dff:0xdec5ff,x+Math.cos(a)*d,.4,z+Math.sin(a)*d,{life:.35,size:[.09,.18,.09],velocity:[-Math.cos(a)*d*2,.5,-Math.sin(a)*d*2],spin:7});}}
 status(kind,x,z,size=1){
  if(kind==='burn')this.particle('flame',0xff8734,x+(Math.random()-.5)*size,.45,z+(Math.random()-.5)*size,{life:.32,size:[.16,.28,.1],velocity:[0,1,0],grow:true,additive:false});
  else if(kind==='frost')this.particle('crystal',0xa5e8ff,x+(Math.random()-.5)*size,.18,z+(Math.random()-.5)*size,{life:.38,size:[.055,.22,.055],grow:true});
  else this.particle('ember',0xbb9eff,x+(Math.random()-.5)*size,.45,z+(Math.random()-.5)*size,{life:.4,size:[.065,.09,.065],velocity:[0,.6,0]});
 }
 boltImpact(x,z,strong=false){
  const count=strong?12:5;
  for(let i=0;i<count;i++){const a=i/count*Math.PI*2,s=strong?2.8:1.5;this.particle('crystal',i%3?0xc3e9ff:0xffffff,x,1.05,z,{life:strong?.42:.25,size:[.045,strong?.31:.16,.045],velocity:[Math.sin(a)*s,(i%3)*.7+.2,Math.cos(a)*s],gravity:4,spin:9});}
  if(strong)this.particle('ember',0x92cafa,x,1.05,z,{life:.26,size:[.32,.32,.32],grow:true,opacity:.7});
 }
 projectile(w){
  const g=new T.Group(),part=(shape,color,scale,z=0)=>{if(!this.materials.has(color))this.materials.set(color,new T.MeshBasicMaterial({color}));const m=new T.Mesh(this.geometry[shape],this.materials.get(color));m.scale.set(...scale);m.position.z=z;g.add(m);return m;};
  if(w.id==='fire'){part('ember',0xffc05c,[.19,.19,.29]);part('crystal',0xff5b23,[.12,.35,.12],-.3).rotation.x=Math.PI/2;}
  else if(w.id==='dark'){part('ember',0x543477,[.2,.2,.25]);part('crystal',0xd2adff,[.10,.25,.1]).rotation.x=Math.PI/2;for(const s of[-1,1]){const m=part('ember',0xab80ec,[.055,.055,.1],-.2);m.position.x=s*.23;}}
  else if(w.id==='shuriken'){for(let i=0;i<3;i++){const m=part('ray',0xa8f5e4,[.07,.045,.65]);m.rotation.y=i*Math.PI/3;}part('ember',0xe1fff3,[.07,.035,.07]);}
  else if(w.id==='crossbow'){part('ray',0x435363,[.035,.035,.66]);part('crystal',0xd9f1ff,[.072,.16,.072],.38).rotation.x=Math.PI/2;for(const s of[-1,1]){const feather=part('ray',0xa8cee5,[.13,.015,.14],-.27);feather.position.x=s*.10;feather.rotation.y=s*.38;}}
  else{const heavy=w.damage>40;part('ray',0xfff1c2,[heavy?.075:.035,.035,heavy?.62:.40]);part('ray',w.color,[.022,.022,.3],-.3);}
  return g;
 }
}

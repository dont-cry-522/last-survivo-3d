import * as T from './vendor/three.module.js';
import {smoothSeams} from './hero-finish.js?v=82';

const bell=(v,c,r)=>Math.exp(-(((v-c)/r)**2));
const width=y=>.087*(1-.08*bell(y,1.588,.030)+.045*bell(y,1.641,.030));
// Continuous cheeks, nose and chin are sculpted into one surface.
export function lingyaFaceDepth(x,y){
 const yn=(y-1.660)/.097,ellipse=Math.sqrt(Math.max(0,1-yn*yn-(x/width(y))**2));
 return -.014+.085*ellipse+.013*bell(x,0,.014)*bell(y,1.637,.013)
  +.003*bell(Math.abs(x),.045,.023)*bell(y,1.644,.024)
  -.003*bell(Math.abs(x),.032,.022)*bell(y,1.659,.014);
}
export function prepareLingyaHead(mesh){
 if(mesh.name==='Eyes'||mesh.name==='Eyebrows'){mesh.visible=false;return;}
 if(!mesh.material.name.includes('Superhero'))return;
 const g=mesh.geometry.clone(),p=g.attributes.position,ix=g.index.array,keep=[];
 for(let i=0;i<ix.length;i+=3)if(Math.max(p.getY(ix[i]),p.getY(ix[i+1]),p.getY(ix[i+2]))<1.540)keep.push(ix[i],ix[i+1],ix[i+2]);
 g.setIndex(keep);for(const i of new Set(keep)){const y=p.getY(i);const f=T.MathUtils.smoothstep(y,1.49,1.54);p.setY(i,y+.052*f);p.setX(i,p.getX(i)*(1-.15*f));p.setZ(i,T.MathUtils.lerp(p.getZ(i),Math.min(.015,p.getZ(i)),f));}g.computeVertexNormals();smoothSeams(g);mesh.geometry=g;
}
export function makeLingyaFace(){
 const root=new T.Group();root.name='Lingya_sculpted_face';root.userData.blinkEyes=[];
 const skin=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.85});
 const geometry=new T.SphereGeometry(1,64,48),p=geometry.attributes.position,colors=[];
 for(let i=0;i<p.count;i++){
  const sy=p.getY(i),y=1.660+sy*.097,x=p.getX(i)*width(y),front=p.getZ(i)>0;
  const z=front?lingyaFaceDepth(x,y):-.014+p.getZ(i)*.086;
  p.setXYZ(i,x,y,z);
  const color=new T.Color(0xefbda1),blush=front?.23*bell(Math.abs(x),.048,.024)*bell(y,1.645,.020):0;
  color.lerp(new T.Color(0xe48d87),blush);colors.push(color.r,color.g,color.b);
 }
 geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();smoothSeams(geometry);
 const head=new T.Mesh(geometry,skin);head.name='Lingya_face_surface';root.add(head);
 const makeMaterial=(color,roughness=.80)=>new T.MeshStandardMaterial({color,roughness});
 const whites=makeMaterial(0xfff3e2,.38),iris=makeMaterial(0x68462d,.35),pupil=makeMaterial(0x211c19,.28),hair=makeMaterial(0x68442e),lip=makeMaterial(0xa15f52);
 const curve=(points,radius,mat,name,parent=root)=>{const g=new T.TubeGeometry(new T.CatmullRomCurve3(points),32,radius,6,false),m=new T.Mesh(g,mat);m.name=name;parent.add(m);return m;};
 const at=(x,y,offset=0)=>new T.Vector3(x,y,lingyaFaceDepth(x,y)+offset);
 for(const sign of[-1,1]){
  const cx=sign*.032,cy=1.659,rx=.022,ry=.0116;const eye=new T.Group();eye.userData.centerY=cy;root.add(eye);root.userData.blinkEyes.push(eye);
  const pos=[],ix=[];const slices=48,rings=10;
  const eyeDepth=(x,y)=>lingyaFaceDepth(x,y)+.0008+.004*Math.max(0,1-((x-cx)/rx)**2-((y-cy)/ry)**2);
  for(let r=0;r<=rings;r++)for(let i=0;i<=slices;i++){
   const a=i/slices*Math.PI*2,t=r/rings,x=cx+Math.cos(a)*rx*t,y=cy+Math.sin(a)*ry*t*(.78+.22*Math.abs(Math.sin(a)));
   pos.push(x,y,eyeDepth(x,y));if(r<rings&&i<slices){const k=r*(slices+1)+i;ix.push(k,k+slices+1,k+1,k+1,k+slices+1,k+slices+2);}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(ix);g.computeVertexNormals();const white=new T.Mesh(g,whites);white.name='Lingya_eye_white';eye.add(white);
  // Irises follow the curved eye surface instead of protruding spheres.
  for(const[radius,mat,offset,name]of [[.0095,iris,.0003,'iris'],[.0050,pupil,.0005,'pupil']]){
   const d=new T.CircleGeometry(radius,40),dp=d.attributes.position;
   for(let i=0;i<dp.count;i++){const x=cx+dp.getX(i),y=cy+dp.getY(i);dp.setXYZ(i,x,y,eyeDepth(x,y)+offset);}d.computeVertexNormals();const m=new T.Mesh(d,mat);m.name='Lingya_'+name;eye.add(m);
  }
  const glint=new T.Mesh(new T.SphereGeometry(.0018,10,8),new T.MeshBasicMaterial({color:0xfff8e8}));glint.position.set(cx-.003,cy+.004,eyeDepth(cx-.003,cy+.004)+.001);eye.add(glint);
  const lid=[];for(let i=0;i<=12;i++){const a=i/12*Math.PI,x=cx+Math.cos(a)*rx,y=cy+Math.sin(a)*ry*(.78+.22*Math.sin(a));lid.push(at(x,y,.0011));}curve(lid,.0007,hair,'Lingya_upper_lid',eye);
  const brow=[];for(let i=0;i<=12;i++){const u=i/12,x=cx+sign*(u-.5)*.041,y=1.682+.004*Math.sin(u*Math.PI)-.002*u;brow.push(at(x,y,.002));}curve(brow,.0013,hair,'Lingya_brow');
 }
 const mouth=[];for(let i=0;i<=16;i++){const u=i/16*2-1,x=u*.016,y=1.615+.003*u*u;mouth.push(at(x,y,.0008));}curve(mouth,.00065,lip,'Lingya_smile');
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return root;
}

export function animateLingyaFace(face,t){
 const openness=Math.max(.055,1-Math.exp(-(((t%4.6-4.35)/.065)**2)));
 for(const eye of face.userData.blinkEyes){eye.scale.y=openness;eye.position.y=eye.userData.centerY*(1-openness);}
}

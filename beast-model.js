import * as T from './vendor/three.module.js';
const geo=new Map(),mats=new Map();
function material(c){if(!mats.has(c))mats.set(c,new T.MeshStandardMaterial({color:c,roughness:.84}));return mats.get(c);}
function sphere(g,c,x,y,z,sx,sy,sz){if(!geo.has('sphere'))geo.set('sphere',new T.SphereGeometry(1,24,16));const m=new T.Mesh(geo.get('sphere'),material(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;g.add(m);return m;}
const joint=(g,x,y,z)=>{const n=new T.Group();n.position.set(x,y,z);g.add(n);return n;};
let boneTemplate;
export function boneBoomerang(){
 if(boneTemplate)return boneTemplate.clone();const g=new T.Group(),shape=new T.Shape();shape.moveTo(-.43,.30);shape.quadraticCurveTo(-.35,.06,-.12,-.15);shape.quadraticCurveTo(0,-.28,.12,-.15);shape.quadraticCurveTo(.35,.06,.43,.30);shape.quadraticCurveTo(.34,.35,.26,.20);shape.lineTo(0,.02);shape.lineTo(-.26,.20);shape.quadraticCurveTo(-.34,.35,-.43,.30);
 const geometry=new T.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelSize:.025,bevelThickness:.02,bevelSegments:3,steps:1,curveSegments:18});geometry.rotateX(Math.PI/2);const blade=new T.Mesh(geometry,material(0xe7dcc1));g.add(blade);
 for(let i=0;i<4;i++){const wrap=sphere(g,0x6e7758,(i-1.5)*.034,.015,-.06,.016,.045,.083);wrap.rotation.y=(i-1.5)*.15;}
 sphere(g,0xc69c5f,0,.055,-.05,.045,.025,.045);g.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});boneTemplate=g;return g.clone();
}
export function makeBadger(){
 const g=new T.Group(),rig=new T.Group();g.add(rig);const d=g.userData={rig,legs:[],phase:0};
 // A broad low torso and tapered mask distinguish the badger from the enemy wolf.
 d.body=sphere(rig,0x666a68,0,.42,-.03,.34,.29,.53);sphere(rig,0xb1aaa0,0,.31,.09,.29,.14,.37);
 const head=joint(rig,0,.45,.40);d.head=head;
 if(!geo.has('badgerHead')){const h=new T.SphereGeometry(1,28,18),p=h.attributes.position,colors=[];for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),taper=1-Math.max(0,z)*.45;p.setXYZ(i,x*.26*taper,y*.225*(1-Math.max(0,z)*.2),z*.33);const stripe=Math.abs(x)>.22&&Math.abs(x)<.73&&y>-.50,grain=.93+.04*Math.sin(x*37+y*22+z*19),c=new T.Color(stripe?0x292e32:0xe1dbcc).multiplyScalar(grain);colors.push(c.r,c.g,c.b);}h.setAttribute('color',new T.Float32BufferAttribute(colors,3));h.computeVertexNormals();geo.set('badgerHead',h);mats.set('mask',new T.MeshStandardMaterial({vertexColors:true,roughness:.86}));}
 const face=new T.Mesh(geo.get('badgerHead'),mats.get('mask'));face.castShadow=true;head.add(face);sphere(head,0x252c2d,0,-.035,.323,.064,.045,.04);
 for(const sign of[-1,1]){const ear=joint(head,sign*.20,.17,-.025);sphere(ear,0x484c49,0,0,0,.082,.091,.045);sphere(ear,0xc7b69d,0,.008,.033,.049,.057,.016);d['ear'+sign]=ear;sphere(head,0x182323,sign*.145,.052,.205,.032,.035,.020);sphere(head,0xf4e8ca,sign*.145-.008,.063,.223,.008,.009,.006);}
 for(const side of[-1,1])for(const z of[-.35,.31]){const leg=joint(rig,side*.255,.31,z);sphere(leg,0x474b48,0,-.07,0,.095,.15,.11);sphere(leg,0x353c3c,0,-.21,.045,.12,.065,.16);for(let k=0;k<3;k++)sphere(leg,0xc8b998,(k-1)*.046,-.22,.181,.012,.014,.04);d.legs.push({joint:leg,phase:z>0?(side>0?0:Math.PI):(side>0?Math.PI:0)});}
 d.tail=joint(rig,0,.36,-.49);sphere(d.tail,0x737770,0,.07,-.15,.105,.105,.22);sphere(d.tail,0xc0bdb0,0,.08,-.32,.07,.07,.08);
 // Small cloth kerchief ties it visually to Lingya without armor or distracting glow.
 sphere(rig,0x678273,0,.36,.35,.29,.095,.13);return g;
}
export function animateBadger(g,t,speed,state='follow',progress=0){const d=g.userData,dt=d.last===undefined?1/60:Math.max(0,Math.min(.05,t-d.last));d.last=t;d.phase+=speed*dt*6;const stride=Math.min(1,speed/4),leap=state==='pounce'?Math.sin(Math.PI*progress):0,brace=state==='wind'?Math.sin(progress*Math.PI/2):0;
 d.rig.position.y=Math.abs(Math.sin(d.phase))*stride*.035+leap*.38-brace*.065;d.rig.rotation.z=Math.sin(d.phase)*stride*.025;d.rig.rotation.x=-leap*.20+brace*.08;
 for(const l of d.legs){l.joint.rotation.x=Math.sin(d.phase+l.phase)*stride*.48-leap*.45;l.joint.position.y=.31+Math.max(0,Math.cos(d.phase+l.phase))*stride*.035;}
 d.body.scale.y=.29*(1+Math.sin(t*2.5)*.014);d.head.position.z=.40+Math.sin(t*3.5)*.009;d.head.rotation.x=brace*.18-leap*.16+Math.sin(t*1.7)*.025;d.head.rotation.y=state==='follow'&&speed<.2?Math.sin(t*.8)*.12:0;d.tail.rotation.y=Math.sin(t*4+d.phase*.5)*(.08+stride*.12);d['ear-1'].rotation.z=Math.sin(t*2.3)*.06;d.ear1.rotation.z=-Math.sin(t*2.3+.8)*.06;
}

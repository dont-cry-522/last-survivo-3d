import * as T from './vendor/three.module.js';
let template;
export function tideHarness(){
 if(template)return template.clone();
 const g=new T.Group();g.name='Tide_coastal_harness';
 const cloth=new T.MeshStandardMaterial({color:0x496c6b,roughness:.87,side:T.DoubleSide}),copper=new T.MeshStandardMaterial({color:0xab8c5c,metalness:.48,roughness:.48}),glass=new T.MeshStandardMaterial({color:0x659e9f,metalness:.15,roughness:.27});
 const points=[[-.15,1.49,.11],[-.11,1.39,.158],[0,1.25,.179],[.13,1.11,.14]],pos=[],indices=[];
 points.forEach(([x,y,z])=>{pos.push(x-.033,y,z,x+.033,y,z+.004)});for(let i=0;i<points.length-1;i++){const j=i*2;indices.push(j,j+2,j+1,j+1,j+2,j+3);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(indices);geo.computeVertexNormals();g.add(new T.Mesh(geo,cloth));
 const shape=new T.Shape();shape.moveTo(0,.038);shape.lineTo(.026,0);shape.lineTo(0,-.038);shape.lineTo(-.026,0);shape.closePath();const gem=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:true,bevelSize:.005,bevelThickness:.003,bevelSegments:2,steps:1}),glass);gem.position.set(-.01,1.43,.174);g.add(gem);
 const buckle=new T.Mesh(new T.TorusGeometry(.033,.007,6,16),copper);buckle.scale.y=.8;buckle.position.set(.074,1.16,.166);g.add(buckle);
 g.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});template=g;return g.clone();
}

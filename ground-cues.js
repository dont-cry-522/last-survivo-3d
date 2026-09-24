import * as T from './vendor/three.module.js';

const plane=new T.PlaneGeometry(2,2),textures=new Map();
function texture(style){
 if(textures.has(style))return textures.get(style);
 // Data textures also work in the headless map checks. Share them across every run.
 const size=128,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=(x+.5)/size*2-1,v=(y+.5)/size*2-1,r=Math.hypot(u,v);let alpha=0;
  if(style==='lane'){
   const edge=(1-T.MathUtils.smoothstep(Math.abs(u),.78,1))*(1-T.MathUtils.smoothstep(Math.abs(v),.88,1));
   const chevron=Math.abs(((v+.85+Math.abs(u)*.24)% .55+.55)% .55-.275)<.035;
   alpha=edge*(chevron?.6:.13);
  }else if(style==='pounce'){
   for(const offset of [-.42,0,.42])alpha=Math.max(alpha,(1-T.MathUtils.smoothstep(Math.abs(u-offset-v*.2),.025,.09))*(1-T.MathUtils.smoothstep(Math.abs(v),.5,.9))*.85);
  }else if(style==='danger')alpha=r<1?(.25+.22*T.MathUtils.smoothstep(r,.4,.85))*(1-T.MathUtils.smoothstep(r,.9,1)):0;
  else alpha=Math.pow(Math.max(0,1-r*r),2)*.7;
  const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.round(alpha*255);
 }
 const map=new T.DataTexture(data,size,size);map.magFilter=map.minFilter=T.LinearFilter;map.needsUpdate=true;textures.set(style,map);return map;
}
export function groundCue(color,r=1,style='danger',opacity=.58){
 const m=new T.Mesh(plane,new T.MeshBasicMaterial({map:texture(style),color,transparent:true,opacity,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
 m.rotation.x=-Math.PI/2;m.scale.set(r,r,1);m.userData.groundCue=style;m.userData.ownedMaterial=true;return m;
}
export function disposeCue(mesh){if(mesh?.userData.ownedMaterial)mesh.material.dispose();}

import * as T from './vendor/three.module.js';

// Five feathered cloth-like traces share one surface/draw. No particles accumulate.
const positions=[],uvs=[],phases=[],trails=[],indices=[],segments=12;
const bands=[
 {x:-.43,y:.80,height:.68,z:-.04,tail:.10,width:.17,phase:.2,trail:0},
 {x:.43,y:.84,height:.64,z:-.04,tail:.10,width:.16,phase:2.3,trail:0},
 {x:.035,y:.62,height:.64,z:-.27,tail:.10,width:.19,phase:4.5,trail:0},
 {x:-.11,y:.66,height:.53,z:-.27,tail:.32,width:.13,phase:1.3,trail:1},
 {x:.15,y:.70,height:.40,z:-.30,tail:.26,width:.11,phase:3.5,trail:1}
];
for(const band of bands){
 const base=positions.length/3;
 for(let row=0;row<=segments;row++)for(let side=0;side<=1;side++){
  const v=row/segments,curve=Math.sin(v*Math.PI),width=band.width*(.32+.68*curve);
  positions.push(band.x+Math.sin(v*3.5+band.phase)*.035+(side-.5)*width,band.y+v*band.height,band.z-band.tail*(1-v)+curve*.025);
  uvs.push(side,v);phases.push(band.phase);trails.push(band.trail);
  if(row<segments&&side===0){const i=base+row*2;indices.push(i,i+1,i+2,i+1,i+3,i+2);}
 }
}
const geometry=new T.BufferGeometry();
geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
geometry.setAttribute('aPhase',new T.Float32BufferAttribute(phases,1));
geometry.setAttribute('aTrail',new T.Float32BufferAttribute(trails,1));
geometry.setIndex(indices);geometry.computeBoundingSphere();geometry.boundingSphere.radius+=.04;

const vertexShader=`
#include <clipping_planes_pars_vertex>
#include <fog_pars_vertex>
uniform float clock;
uniform float motion;
uniform float dash;
attribute float aPhase;
attribute float aTrail;
varying vec2 vUv;
varying float vPhase;
varying float vTrail;
void main(){
 vUv=uv;vPhase=aPhase;vTrail=aTrail;
 vec3 p=position;
 float freeEdge=sin(uv.y*3.14159265);
 p.x+=sin(clock*.85+uv.y*5.0+aPhase)*(.009+motion*.012)*freeEdge;
 p.y+=sin(clock*.65+aPhase)*.014*freeEdge;
 p.z+=cos(clock*.72+uv.y*4.0+aPhase)*.012*freeEdge-aTrail*dash*.012*freeEdge;
 vec4 mvPosition=modelViewMatrix*vec4(p,1.0);
 gl_Position=projectionMatrix*mvPosition;
 #include <clipping_planes_vertex>
 #include <fog_vertex>
}`;
const fragmentShader=`
#include <clipping_planes_pars_fragment>
#include <fog_pars_fragment>
uniform float clock;
uniform float motion;
uniform float attack;
uniform float dash;
varying vec2 vUv;
varying float vPhase;
varying float vTrail;
void main(){
 #include <clipping_planes_fragment>
 float edge=smoothstep(0.0,.30,vUv.x)*(1.0-smoothstep(.70,1.0,vUv.x));
 float ends=pow(max(0.0,sin(vUv.y*3.14159265)),1.5);
 float fold=.5+.5*sin(vUv.y*7.0-clock*.75+vPhase);
 float seam=vUv.x-.48-.065*sin(vUv.y*5.0+clock*.60+vPhase);
 float core=exp(-seam*seam*34.0);
 float presence=mix(.118+.025*attack,.105*motion+.038*dash,vTrail);
 float opacity=edge*ends*presence*(.58+.24*fold+.18*core);
 vec3 color=mix(vec3(.20,.29,.36),vec3(.35,.48,.57),core*.65+attack*.12);
 gl_FragColor=vec4(color,opacity);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 #include <fog_fragment>
}`;

export function createShadowAura(){
 const group=new T.Group();group.name='Shadow_soft_traces';
 const material=new T.ShaderMaterial({vertexShader,fragmentShader,uniforms:T.UniformsUtils.merge([T.UniformsLib.fog,{clock:{value:0},motion:{value:0},attack:{value:0},dash:{value:0}}]),transparent:true,depthWrite:false,side:T.DoubleSide,forceSinglePass:true,clipping:true,fog:true});
 const mesh=new T.Mesh(geometry,material);mesh.name='Shadow_feathered_back_traces';group.add(mesh);
 group.userData.shadowAura={material,lastTime:undefined,disposed:false};
 return group;
}

export function updateShadowAura(group,time,speed=0,attack=0,dash=0){
 const state=group?.userData.shadowAura;if(!state||state.disposed||!Number.isFinite(time))return;
 const dt=state.lastTime===undefined?1/60:Math.max(0,Math.min(.1,time-state.lastTime));state.lastTime=time;
 const u=state.material.uniforms,clamp=value=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
 u.clock.value=time;
 const moving=clamp(speed/6.5);u.motion.value+=(moving-u.motion.value)*(1-Math.exp(-dt*(moving>u.motion.value?12:5)));
 u.attack.value+=(clamp(attack*3)-u.attack.value)*(1-Math.exp(-dt*18));
 u.dash.value+=(clamp(dash*6)-u.dash.value)*(1-Math.exp(-dt*22));
}

export function disposeShadowAura(group){
 const state=group?.userData.shadowAura;if(!state||state.disposed)return;
 state.disposed=true;state.material.dispose();group.visible=false;
}

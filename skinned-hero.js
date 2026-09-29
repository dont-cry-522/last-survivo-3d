import{tideHarness}from'./tide-appearance.js?v=69';
import{newHeroAttack,heroCarryPose,committedWeaponYaw}from'./new-hero-motion.js?v=69';
import{heroDodgePose}from'./hero-dodge.js?v=69';
import{lingyaHopPose}from'./lingya-motion.js?v=69';
import{lingyaOutfit,lingyaAccessories,lingyaLegs}from'./lingya-appearance.js?v=69';
import{boneBoomerang}from'./beast-model.js?v=69';
import{makeHarpoon}from'./coast-models.js?v=69';
import{guardianOutfit,guardianHair}from'./guardian-appearance.js?v=69';
import{equipGuardian,animateGuardian}from'./guardian-model.js?v=69';
import{weaponGesture,shotStarted}from'./weapon-performance.js?v=69';
import{rollProgress,rollWeight}from'./dodge-motion.js?v=69';
import * as T from './vendor/three.module.js';
import {clone} from './vendor/SkeletonUtils.js';
import {loadCharacterData} from './character-loader.js?v=69';
import {makeHero as makePrototype} from './hero-model.js?v=69';

const templates=new Map(),clips=new Map();

let loaded=false;
const upper=/^(spine_|clavicle|upperarm|lowerarm|hand|index|middle|pinky|ring|thumb)/;
const isUpper=t=>upper.test(t.name.match(/\[([^\]]+)\]/)?.[1]||t.name.split('.')[0]);
const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function reverseClip(clip){
  const reversed=clip.clone();reversed.name=clip.name+'-reverse';
  for(const track of reversed.tracks){const times=track.times.slice(),values=track.values.slice(),size=track.getValueSize(),n=times.length;for(let i=0;i<n;i++){track.times[i]=clip.duration-times[n-1-i];for(let k=0;k<size;k++)track.values[i*size+k]=values[(n-1-i)*size+k];}}
  return reversed;
}
function cutGeometry(geometry,keepTriangle){
  const g=geometry.clone(),p=g.attributes.position,ids=g.index?.array,keep=[];
  for(let i=0;i<(ids?.length||p.count);i+=3){const a=ids?ids[i]:i,b=ids?ids[i+1]:i+1,c=ids?ids[i+2]:i+2;if(keepTriangle(p,a,b,c))keep.push(a,b,c);}
  g.setIndex(keep);g.computeBoundingBox();g.computeBoundingSphere();return g;
}
function hunterLegs(base){
  let source;base.traverse(o=>{if(o.isSkinnedMesh&&o.material.name.includes('Superhero'))source=o;});
  const legs=source.clone();legs.name='Silver_Hunter_Boots_Shorts';
  legs.geometry=cutGeometry(source.geometry,(p,a,b,c)=>Math.max(p.getY(a),p.getY(b),p.getY(c))<1.09&&Math.min(p.getY(a),p.getY(b),p.getY(c))>.095);
  legs.material=source.material.clone();skinTone(legs.material,'silver');legs.material.normalScale.set(.10,.10);legs.material.roughness=.63;
  const skinCompile=legs.material.onBeforeCompile;
  legs.material.onBeforeCompile=s=>{
    skinCompile(s);s.vertexShader='varying vec3 vHunterRest;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvHunterRest=position;');
    s.fragmentShader='varying vec3 vHunterRest;\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float h=vHunterRest.y;
      float leather=1.0-smoothstep(.681,.686,h)+smoothstep(.878,.883,h);
      float trim=(1.0-smoothstep(.003,.007,abs(h-.676)))+(1.0-smoothstep(.002,.005,abs(h-.887)));
      vec3 bootColor=mix(vec3(.016,.022,.028),vec3(.15,.17,.18),clamp(trim,0.0,1.0));
      diffuseColor.rgb=mix(diffuseColor.rgb,bootColor,clamp(leather+trim,0.0,1.0));`);
  };legs.material.customProgramCacheKey=()=> 'silver-hunter-legs';return legs;
}
function firstSkin(root){let result;root.traverse(o=>{if(o.isSkinnedMesh&&!result)result=o;});return result;}
function palette(material,color){
  material.color.set(0xffffff);material.roughness=.88;material.metalness=.025;
  material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    float clothValue=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
    diffuseColor.rgb=vec3(.055,.06,.067)+clothValue*vec3(.25,.27,.29);`);};
  material.customProgramCacheKey=()=>String(color);
}
function skinTone(material,kind){
  material.color.set(0xffffff);material.metalness=0;material.roughness=.86;material.normalScale.set(kind==='lingya'?.12:.28,kind==='lingya'?.12:.28);
  material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    float skinShade=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
    diffuseColor.rgb=vec3(${kind==='silver'?'.80,.66,.60':kind==='lingya'?'.78,.60,.47':'.63,.43,.32'})*(.72+skinShade*.42)+diffuseColor.rgb*.09;`);};
  material.customProgramCacheKey=()=> 'skin-'+kind;
}
function bindParts(root,extra,onlyHead=false,kind=''){
  const target=firstSkin(root).skeleton,bones=new Map(target.bones.map(b=>[b.name,b]));const meshes=[];
  extra.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});
  for(const m of meshes){
    if(onlyHead&&m.material.name.includes('Superhero')){
      const g=m.geometry.clone(),p=g.attributes.position,ids=g.index?.array,keep=[];
      // The source base body is continuous; retain only head and neck above the outfit collar.
      for(let i=0;i<(ids?.length||p.count);i+=3){const a=ids?ids[i]:i,b=ids?ids[i+1]:i+1,c=ids?ids[i+2]:i+2;if(Math.min(p.getY(a),p.getY(b),p.getY(c))>(['silver','lingya'].includes(kind)?1.54:1.58))keep.push(a,b,c);}
      if(kind==='silver')for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(y>1.51){const jaw=Math.exp(-(((y-1.572)/.045)**2));x*=1-.13*jaw;if(y<1.62)y+=.006*jaw;if(z>.08&&Math.abs(x)<.027&&y>1.60&&y<1.665)z-=.007*Math.exp(-(((y-1.635)/.024)**2));p.setXYZ(i,x,y,z);}}
      g.setIndex(keep);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();m.geometry=g;
    }
    if(onlyHead&&kind==='lingya'&&m.material.name.includes('Superhero')){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(y>1.54){const cheek=Math.exp(-(((y-1.625)/.053)**2));x*=1+.16*cheek;if(y<1.61)y+=.016*Math.exp(-(((y-1.57)/.04)**2));if(z>.08&&Math.abs(x)<.025&&y>1.61&&y<1.70)z-=.009*Math.exp(-(((y-1.655)/.035)**2));p.setXYZ(i,x,y,z);}}m.geometry.computeVertexNormals();}
    const mapped=m.skeleton.bones.map(b=>bones.get(b.name));if(mapped.some(b=>!b))throw Error('角色骨骼不匹配');
    m.skeleton=new T.Skeleton(mapped,m.skeleton.boneInverses);root.add(m);
  }
}
export async function loadHeroAssets(onProgress=()=>{}){
  if(loaded)return;
  const {models:assets,clips:bakedClips}=await loadCharacterData(onProgress);
  const tideBase=clone(assets['silver-base'].scene),lingyaBase=clone(assets['silver-base'].scene),lingyaHair=clone(assets['silver-hair'].scene),lingya=clone(assets['silver-outfit'].scene);
  for(const kind of ['silver','scout']){
    const root=assets[kind+'-outfit'].scene;root.skeleton=firstSkin(root).skeleton;
    root.traverse(o=>{if(o.isMesh){if(o.name.includes('Head_Hood')||kind==='silver'&&/Pauldrons|_Legs|Belt_1/.test(o.name))o.visible=false;o.material=o.material.clone();if(kind==='silver'&&o.material.name.includes('Ranger'))palette(o.material,0x526075);if(o.material.name.includes('Regular'))skinTone(o.material,kind);
      if(kind==='silver'&&o.name.includes('_Feet')){o.geometry=cutGeometry(o.geometry,(p,a,b,c)=>Math.min(p.getY(a),p.getY(b),p.getY(c))<.16);o.material=new T.MeshStandardMaterial({color:0x141c24,roughness:.57,metalness:.08});}
      if(kind==='silver'&&o.name.includes('Body')){o.geometry=o.geometry.clone();const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);p.setX(i,p.getX(i)*(1-.12*Math.exp(-(((y-1.13)/.105)**2))));}o.geometry.computeVertexNormals();}
    }});
    const base=assets[kind+'-base'].scene;base.traverse(o=>{if(o.isMesh){o.material=o.material.clone();if(o.material.name.includes('Hair'))o.material.color.set(kind==='silver'?0x65717f:0x38251d);if(o.material.name.includes('Superhero'))skinTone(o.material,kind);}});
    if(kind==='silver'){const extra=new T.Group();extra.add(hunterLegs(base));bindParts(root,extra);}
    bindParts(root,base,true,kind);
    const hair=assets[kind+'-hair'].scene;hair.traverse(o=>{if(o.isMesh){o.userData.hairstyle=true;o.material=o.material.clone();if(kind==='silver'){
      o.material.color.set(0xdde7f1);o.material.roughness=.78;o.material.normalScale.set(.45,.45);
      o.material.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
        float strand=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
        diffuseColor.rgb=vec3(.69,.75,.83)*(.7+strand*.55);`);};o.material.customProgramCacheKey=()=> 'silver-hair';
    }else o.material.color.set(0x58402e);}});bindParts(root,hair);
    root.updateMatrixWorld(true);templates.set(kind,root);
  }
  const guardian=clone(templates.get('scout'));guardian.skeleton=firstSkin(guardian).skeleton;guardianOutfit(guardian);
  for(const role of ['hair','beard']){const detail=assets['guardian-'+role].scene;guardianHair(detail,role);bindParts(guardian,detail);}
  guardian.updateMatrixWorld(true);templates.set('guardian',guardian);
  const tide=assets['tide-outfit'].scene;tide.skeleton=firstSkin(tide).skeleton;
  tide.traverse(o=>{if(o.isMesh){o.material=o.material.clone();if(o.material.name.includes('Regular'))skinTone(o.material,'tide');else{const tint=o.name.includes('Feet')?'.20,.13,.075':o.name.includes('Legs')?'.022,.052,.068':'.035,.12,.16';o.material.color.set(0xffffff);o.material.roughness=.9;o.material.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
float weave=dot(diffuseColor.rgb,vec3(.21,.72,.07));diffuseColor.rgb=vec3(${tint})*(.6+weave*1.8);`);};o.material.customProgramCacheKey=()=> 'tide-coat-'+tint;}}});
  tideBase.traverse(o=>{if(o.isMesh){o.material=o.material.clone();if(o.material.name.includes('Superhero'))skinTone(o.material,'tide');if(o.material.name.includes('Hair'))o.material.color.set(0x231f22);}});bindParts(tide,tideBase,true,'silver');
  const tideHair=assets['tide-hair'].scene;tideHair.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.color.set(0x29202a);}});bindParts(tide,tideHair);tide.updateMatrixWorld(true);templates.set('tide',tide);
  lingya.skeleton=firstSkin(lingya).skeleton;lingyaOutfit(lingya);const legs=new T.Group();legs.add(lingyaLegs(lingyaBase));bindParts(lingya,legs);
  lingya.traverse(o=>{if(o.isMesh&&o.material.name.includes('Regular')){o.material=o.material.clone();skinTone(o.material,'lingya');}});
  lingyaBase.traverse(o=>{if(o.isMesh){o.material=o.material.clone();if(o.material.name.includes('Superhero'))skinTone(o.material,'lingya');if(o.material.name.includes('Hair')){o.material.color.set(0x78563e);o.geometry=o.geometry.clone();const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,1.675+(p.getY(i)-1.675)*.48+.003);o.geometry.computeVertexNormals();}}});bindParts(lingya,lingyaBase,true,'lingya');
  lingyaHair.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.color.set(0x795433);o.geometry=cutGeometry(o.geometry,(p,a,b,c)=>Math.min(p.getY(a),p.getY(b),p.getY(c))>1.525);const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)if(p.getZ(i)>0)p.setZ(i,p.getZ(i)+.014);o.geometry.computeVertexNormals();}});bindParts(lingya,lingyaHair);lingya.updateMatrixWorld(true);templates.set('lingya',lingya);
  for(const c of bakedClips)clips.set(c.name,c);
  loaded=true;
}
export function heroesReady(){return loaded;}
function attachAtRest(bone,object,root){
  root.updateMatrixWorld(true);object.applyMatrix4(bone.matrixWorld.clone().invert().multiply(root.matrixWorld));bone.add(object);
}
function capeMesh(kind){
  const pos=[],uv=[],colors=[],ix=[],cols=24,rows=28;
  for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){const u=x/cols,v=y/rows,w=.22+.13*Math.sin(v*Math.PI*.86),split=.10*Math.exp(-(((u-.5)/.065)**2))*v**8;if(kind==='lingya'){const a=.56+u*(Math.PI*2-1.12),r=.12+.145*Math.sin(v*Math.PI/2);pos.push(Math.sin(a)*r,-v*.25+Math.sin(a*7)*.007*v,Math.cos(a)*r);}else pos.push((u-.5)*w*2,-v*.86+split+Math.cos(u*Math.PI*4)*.013*v,-.12*v-.04*Math.sin(u*Math.PI)+Math.sin(u*Math.PI*8)*.016*v);uv.push(u,v);const edge=x===0||x===cols||y===rows,color=new T.Color(kind==='lingya'?(edge?0xd7c8a5:0x688a74):kind==='tide'?(edge?0xbba879:0x3b686e):kind==='guardian'?(edge?0xc6a464:0x852b37):(edge?0x65727d:0x252936));colors.push(color.r,color.g,color.b);}
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=y*(cols+1)+x;ix.push(a,a+cols+1,a+1,a+1,a+cols+1,a+cols+2);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(ix);geometry.computeVertexNormals();
  const material=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.87,side:T.DoubleSide}),wind={time:{value:0},run:{value:0},turn:{value:0}};
  material.onBeforeCompile=s=>{s.uniforms.capeTime=wind.time;s.uniforms.capeRun=wind.run;s.uniforms.capeTurn=wind.turn;s.vertexShader='uniform float capeTime; uniform float capeRun; uniform float capeTurn;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    float freeHem=clamp(-position.y/${kind==='lingya'?'.25':'.85'},0.0,1.0);
    transformed.z+=sin(position.y*9.0+capeTime*5.0)*(.009+capeRun*.026)*freeHem;
    transformed.x+=(sin(capeTime*3.0+position.y*6.0)*.012+capeTurn*.14)*freeHem*freeHem;
    transformed.z+=sin(position.x*14.0+position.y*7.0-capeTime*3.0)*capeRun*.009*freeHem;`);};
  material.customProgramCacheKey=()=> 'hero-cape-'+kind;const m=new T.Mesh(geometry,material);m.userData.wind=wind;m.position.set(0,kind==='lingya'?1.49:1.43,kind==='lingya'?-.025:-.14);m.castShadow=true;m.receiveShadow=true;return m;
}
function faceMask(){
  const pos=[],ix=[],cols=16,rows=6;
  for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){const u=x/cols*2-1,v=y/rows,top=1.635-Math.abs(u)*.02,bottom=1.552+Math.abs(u)*.014;pos.push(u*.077*(1-v*.1),top+(bottom-top)*v, .080+.063*Math.sqrt(1-u*u)+Math.sin(v*Math.PI)*.008);}
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=y*(cols+1)+x;ix.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));geometry.setIndex(ix);geometry.computeVertexNormals();const m=new T.Mesh(geometry,new T.MeshStandardMaterial({color:0x11191f,roughness:.98,side:T.DoubleSide}));m.castShadow=true;return m;
}
const stringUp=new T.Vector3(0,1,0);
function drawCrossbow(gun,pull,phase){
  const strings=gun.userData.crossbowStrings;if(!strings)return;
  for(let i=0;i<2;i++){const start=new T.Vector3(i? .44:-.44,.11,.36),end=new T.Vector3(0,.12,.29-pull),direction=end.clone().sub(start),length=direction.length(),mesh=strings[i];mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(stringUp,direction.normalize());mesh.scale.y=length;}
  gun.userData.stringPull=pull;gun.userData.crossbowBolt.visible=phase>.72;
}
export function createSkinnedHero(kind,weapon){
  const g=new T.Group(),rig=new T.Group(),model=clone(templates.get(kind));rig.add(model);g.add(rig);rig.scale.setScalar(1.12);if(kind==='lingya')rig.scale.set(1.02,.73,1.02);
  model.skeleton=firstSkin(model).skeleton;const bones=new Map();model.traverse(o=>{if(o.isBone)bones.set(o.name,o);if(o.isMesh){o.castShadow=o.receiveShadow=true;o.frustumCulled=false;}});
  const mixer=new T.AnimationMixer(model),actions={};for(const [name,clip]of clips)actions[name]=mixer.clipAction(clip);
  let idleClip=clips.get('Idle_Loop');
  if(kind==='silver'){
    const lower=t=>/^(root|pelvis|thigh|calf|foot|ball)/.test(t.name.match(/\[([^\]]+)\]/)?.[1]||t.name.split('.')[0]);
    idleClip=new T.AnimationClip('Silver_Idle',clips.get('Pistol_Idle_Loop').duration,[...clips.get('Idle_Loop').tracks.filter(t=>!lower(t)),...clips.get('Pistol_Idle_Loop').tracks.filter(lower)]);
  }
  const layer=(clip,name,top)=>{const c=clip.clone();c.name=name;c.tracks=c.tracks.filter(t=>isUpper(t)===top);return mixer.clipAction(c);};
  const idle=layer(idleClip,'idle-lower',false),run=layer(clips.get('Jog_Fwd_Loop'),'run-lower',false),upperIdle=layer(idleClip,'idle-upper',true),upperRun=layer(clips.get('Jog_Fwd_Loop'),'run-upper',true);
  const walk=layer(clips.get('Walk_Loop'),'walk-lower',false),upperWalk=layer(clips.get('Walk_Loop'),'walk-upper',true),backRun=layer(reverseClip(clips.get('Jog_Fwd_Loop')),'back-run',false),backWalk=layer(reverseClip(clips.get('Walk_Loop')),'back-walk',false);
  const dodgeActions=['guardian','tide','lingya'].includes(kind)?Object.fromEntries(['Jump_Start','Jump_Loop','Jump_Land'].map(name=>{const a=layer(clips.get(name),'dodge-'+name,false);a.play().setEffectiveWeight(0);a.paused=true;return[name,a];})):null;
  const kineticActions=['guardian','tide','lingya'].includes(kind)?Object.fromEntries(['Punch_Cross','Sword_Attack'].map(name=>{const a=layer(clips.get(name),'kinetic-'+name,false);a.play().setEffectiveWeight(0);a.paused=true;return[name,a];})):null;
  const aimName=['fire','dark','shuriken','boomerang'].includes(weapon)?'Spell_Simple_Idle_Loop':'Pistol_Aim_Neutral';
  const upperClip=clips.get(aimName).clone();upperClip.tracks=upperClip.tracks.filter(isUpper);upperClip.name='upper-aim';
  const aim=mixer.clipAction(upperClip);aim.play();aim.setEffectiveWeight(0);
  // Calibrate the authored weapon grip in the actual aiming pose, then return to idle.
  const fullAim=actions[aimName];fullAim.play();mixer.update(0);model.updateMatrixWorld(true);
  const guardianGrips=kind==='guardian'?[bones.get('hand_l'),bones.get('hand_r')].map(b=>b.getWorldQuaternion(new T.Quaternion())):null;
  const hand=bones.get('hand_r'),gun=kind==='guardian'?new T.Group():weapon==='boomerang'?boneBoomerang():weapon==='harpoon'?makeHarpoon():makePrototype(kind,weapon).userData.weapon;gun.removeFromParent();gun.position.set(0,.045,0);gun.scale.setScalar(weapon==='harpoon'?1.05:weapon==='crossbow'||weapon==='boomerang'?.72:.65);gun.quaternion.copy(hand.getWorldQuaternion(new T.Quaternion()).invert());hand.add(gun);
  fullAim.stop();idle.play();upperIdle.play();run.play().setEffectiveWeight(0);upperRun.play().setEffectiveWeight(0);mixer.update(0);
  for(const a of[walk,upperWalk,backRun,backWalk])a.play().setEffectiveWeight(0);
  model.skeleton.pose();model.updateMatrixWorld(true);
  const owned=[];let cape;
  if(['silver','guardian','tide','lingya'].includes(kind)){
    cape=capeMesh(kind);if(kind==='guardian')cape.scale.set(1.14,1.06,1);if(kind==='tide')cape.scale.set(1.02,.40,1);if(kind==='lingya')cape.scale.set(1,1,1);owned.push(cape);attachAtRest(bones.get('spine_03'),cape,model);
    if(kind==='silver'){const mask=faceMask();owned.push(mask);attachAtRest(bones.get('Head'),mask,model);}
  }
  if(kind==='tide')attachAtRest(bones.get('spine_03'),tideHarness(),model);
  if(kind==='lingya'){const a=lingyaAccessories(),bagPivot=new T.Group();bagPivot.position.set(.24,1,-.10);a.bag.position.set(-.24,-1,.10);bagPivot.add(a.bag);g.userData.satchel=bagPivot;g.userData.skirt=a.skirt;owned.push(a.skirt.children[0]);attachAtRest(bones.get('pelvis'),a.skirt,model);attachAtRest(bones.get('Head'),a.hood,model);attachAtRest(bones.get('spine_03'),a.chest,model);attachAtRest(bones.get('pelvis'),bagPivot,model);g.userData.satchelRest=bagPivot.quaternion.clone();}
  // Slightly larger head silhouette remains legible from the elevated game camera.
  bones.get('Head')?.scale.setScalar(1.08);
  if(kind==='lingya')bones.get('Head')?.scale.set(1.4,1.4*1.02/.73,1.4);
  mixer.update(0);const restCape=cape?.quaternion.clone();
  Object.assign(g.userData,{skinned:true,kind,weaponId:weapon,dodgeActions,kineticActions,rig,model,mixer,actions,idle,run,walk,upperIdle,upperRun,upperWalk,backRun,backWalk,aim,gun,gunRest:gun.quaternion.clone(),aimArm:bones.get('upperarm_r'),firingForearm:bones.get('lowerarm_r'),offArm:bones.get('upperarm_l'),offForearm:bones.get('lowerarm_l'),swimHead:bones.get('Head'),swimLeftKnee:bones.get('calf_l'),swimRightKnee:bones.get('calf_r'),swimLeftFoot:bones.get('foot_l'),swimRightFoot:bones.get('foot_r'),swimLeftLeg:bones.get('thigh_l'),swimRightLeg:bones.get('thigh_r'),pelvis:bones.get('pelvis'),spine:bones.get('spine_01'),cape,restCape,owned,blend:0,aimBlend:0,aimHold:0,smoothedSpeed:0,backBlend:0,gaitYaw:0,gaitPhase:0,reloadPhase:1});
  g.userData.support={hand:bones.get('hand_l'),rightHand:bones.get('hand_r'),elbow:new T.Vector3(),goal:new T.Vector3(),axis:new T.Vector3(),bend:new T.Vector3(),target:new T.Vector3(),origin:new T.Vector3(),from:new T.Vector3(),to:new T.Vector3(),delta:new T.Quaternion(),world:new T.Quaternion(),parent:new T.Quaternion(),start:[new T.Quaternion(),new T.Quaternion()]};
  if(weapon==='crossbow')g.userData.crossbowBase=[g.userData.aimArm,g.userData.firingForearm,g.userData.offArm,g.userData.offForearm].map(bone=>[bone,new T.Quaternion()]);
  else g.userData.attackBase=[g.userData.aimArm,g.userData.firingForearm,g.userData.offArm,g.userData.offForearm].map(bone=>[bone,new T.Quaternion()]);
  if(kind==='tide')g.userData.attackBase.push(...[g.userData.spine,g.userData.swimHead].map(bone=>[bone,bone.quaternion.clone()]));
  if(kind==='lingya')g.userData.lingyaPoseBase=[g.userData.spine,g.userData.swimHead,g.userData.swimLeftLeg,g.userData.swimRightLeg,g.userData.swimLeftKnee,g.userData.swimRightKnee,g.userData.swimLeftFoot,g.userData.swimRightFoot,g.userData.aimArm,g.userData.offArm,g.userData.firingForearm,g.userData.offForearm].map(b=>[b,b.quaternion.clone()]);
  if(kind==='guardian'){
    gun.removeFromParent();equipGuardian(g,guardianGrips);
    g.userData.attackBase=[g.userData.aimArm,g.userData.firingForearm,g.userData.offArm,g.userData.offForearm,g.userData.support.hand,g.userData.support.rightHand,g.userData.spine,g.userData.swimHead].map(bone=>[bone,bone.quaternion.clone()]);
  }
  return g;
}
export function animateSkinnedHero(g,t,speed,attack,hurt){
  const d=g.userData,dt=d.lastTime===undefined?1/60:Math.max(0,Math.min(d.kineticActions?.1:.05,t-d.lastTime));d.lastTime=t;
  if(d.lingyaPoseReady)for(const [bone,q]of d.lingyaPoseBase)bone.quaternion.copy(q);
  const fired=shotStarted(d,attack,d.previousAttack||0);d.previousAttack=attack;d.attackAge=fired?0:(d.attackAge??2)+dt;
  const newHero=!!d.kineticActions,action=newHeroAttack(d.kind,d.shotSerial?(d.reloadDuration?(d.reloadPhase??1)*d.reloadDuration:d.attackAge):10,d.reloadDuration||1);
  const readyTarget=d.aimActive||attack>0||d.shotSerial&&(d.reloadPhase??1)<1||d.dashTime>0?1:0;d.readyBlend=(d.readyBlend||0)+(readyTarget-(d.readyBlend||0))*(1-Math.exp(-dt*10));
  const dodge=heroDodgePose(d.kind,d.dashTime||0),gaitSpeed=dodge?.weight>.01?Math.min(speed,6):speed;
  d.smoothedSpeed+=(gaitSpeed-d.smoothedSpeed)*(1-Math.exp(-dt*(speed>0?15:22)));
  d.blend+=(Math.min(1,speed/1.6)-d.blend)*(1-Math.exp(-dt*(speed>0?14:18)));
  d.aimHold=['guardian','tide','lingya'].includes(d.kind)||attack>0||d.aimActive?.45:Math.max(0,d.aimHold-dt);d.aimBlend+=((d.aimHold>0?(d.kind==='lingya'&&d.boomerangAway&&d.attackAge>.55?.25+.75*(d.catchReady||0):1):0)-d.aimBlend)*(1-Math.exp(-dt*(d.weaponId==='crossbow'?8:20)));
  const relative=Number.isFinite(d.travelAngle)?angleDelta(d.travelAngle,g.rotation.y):0,backward=Math.abs(relative)>Math.PI*.55;
  d.backBlend+=((backward?1:0)-d.backBlend)*(1-Math.exp(-dt*12));
  const travelYaw=newHero?T.MathUtils.lerp(T.MathUtils.clamp(relative,-.85,.85),T.MathUtils.clamp(angleDelta(relative,Math.PI),-.85,.85),d.backBlend):T.MathUtils.clamp(angleDelta(relative,backward?Math.PI:0),-.85,.85);
  const gaitTarget=d.kind==='lingya'&&d.dashTime>0?T.MathUtils.clamp(angleDelta(d.dashAngle??g.rotation.y,g.rotation.y),-1.3,1.3):speed>.1?travelYaw:0;d.gaitYaw+=(gaitTarget-d.gaitYaw)*(1-Math.exp(-dt*12));
  const jogging=T.MathUtils.smoothstep(d.smoothedSpeed,2.2,4.6),runWeight=d.blend*jogging,walkWeight=d.blend*(1-jogging),upperFree=newHero?(1-d.readyBlend)*.72:1-d.aimBlend;
  d.run.setEffectiveWeight(runWeight*(1-d.backBlend));d.backRun.setEffectiveWeight(runWeight*d.backBlend);d.walk.setEffectiveWeight(walkWeight*(1-d.backBlend));d.backWalk.setEffectiveWeight(walkWeight*d.backBlend);d.idle.setEffectiveWeight(1-d.blend);
  d.upperRun.setEffectiveWeight(runWeight*upperFree);d.upperWalk.setEffectiveWeight(walkWeight*upperFree);d.upperIdle.setEffectiveWeight((1-d.blend)*upperFree);
  const strideScale=d.rig.scale.z/1.23;
  const cadence=T.MathUtils.lerp(d.smoothedSpeed/2.5/d.walk.getClip().duration,d.smoothedSpeed/5.8/d.run.getClip().duration,jogging)/strideScale;d.gaitPhase=(d.gaitPhase+dt*cadence*(d.kind==='lingya'?1-lingyaHopPose(d.dashTime||0).air:1))%1;
  for(const a of[d.run,d.backRun,d.upperRun,d.walk,d.backWalk,d.upperWalk]){a.paused=true;a.time=d.gaitPhase*a.getClip().duration;}d.aim.setEffectiveWeight(newHero?1-upperFree:d.aimBlend);
  const isRoll=d.kind==='scout'&&d.dashTime>0&&!(d.waterDepth>.42)&&!d.waterDash,roll=d.actions.Roll,weight=isRoll?rollWeight(d.dashTime):0,poseBlend=(1-weight)*(d.kind==='lingya'?1-lingyaHopPose(d.dashTime||0).weight:1);
  if(isRoll){roll.enabled=true;roll.setLoop(T.LoopOnce,1);roll.clampWhenFinished=true;roll.play();roll.setEffectiveWeight(weight);roll.paused=true;roll.time=rollProgress(d.dashTime)*roll.getClip().duration;for(const a of[d.idle,d.run,d.walk,d.backRun,d.backWalk,d.upperIdle,d.upperRun,d.upperWalk,d.aim])a.setEffectiveWeight(a.getEffectiveWeight()*poseBlend);}else roll.stop();
  if(d.dodgeActions){
    for(const action of Object.values(d.dodgeActions))action.setEffectiveWeight(0);
    if(dodge.weight>0){
      const w=dodge.weight*(d.kind==='guardian'?1-Math.min(speed/1.4,1):1);for(const a of[d.idle,d.run,d.walk,d.backRun,d.backWalk])a.setEffectiveWeight(a.getEffectiveWeight()*(1-w));
      const set=(name,weight,time)=>{const action=d.dodgeActions[name];action.time=Math.min(action.getClip().duration-.001,Math.max(0,time));action.setEffectiveWeight(weight*w);};
      if(d.kind==='guardian'||d.kind==='tide')set('Jump_Start',1,.035);
      else{set('Jump_Start',dodge.launch,dodge.startTime);set('Jump_Loop',dodge.air,dodge.airTime);set('Jump_Land',dodge.land,dodge.landTime);}
    }
  }
  if(d.kineticActions){
    const u=T.MathUtils.clamp(d.reloadPhase??1,0,1),guardWeight=d.shotSerial?T.MathUtils.smoothstep(u,0,.12)*(1-T.MathUtils.smoothstep(u,.76,1)):0;
    const amount=(d.kind==='guardian'?guardWeight:action.weight)*(1-T.MathUtils.smoothstep(d.smoothedSpeed,.4,2.5))*(1-(dodge?.weight||0))*(1-(d.waterBlend||0));
    for(const a of Object.values(d.kineticActions))a.setEffectiveWeight(0);
    if(amount>0){for(const a of[d.idle,d.run,d.walk,d.backRun,d.backWalk])a.setEffectiveWeight(a.getEffectiveWeight()*(1-amount));
      const a=d.kineticActions[d.kind==='guardian'&&d.meleeCombo>0||d.kind==='lingya'||d.kind==='tide'&&d.harpoonCombo===1?'Sword_Attack':'Punch_Cross'];a.time=(d.kind==='guardian'?u:action.clipPhase)*(a.getClip().duration-.001);a.setEffectiveWeight(amount*.85);d.idle.setEffectiveWeight(d.idle.getEffectiveWeight()+amount*.15);
    }
  }
  d.presence=heroCarryPose(d.kind,t,d.gaitPhase,d.blend,d.readyBlend);d.carryTurn=(d.carryTurn||0)+((newHero?T.MathUtils.clamp((d.turnRate||0)*.045,-.18,.18):0)-(d.carryTurn||0))*(1-Math.exp(-dt*5));
  if(d.kind==='lingya')d.rig.rotation.z-=d.hopBank||0;
  const bank=isRoll?0:T.MathUtils.clamp(-(d.turnRate||0)*.008,-.075,.075)*d.blend;d.rig.rotation.z+=(bank-d.rig.rotation.z)*(1-Math.exp(-dt*10));
  // Recovery belongs to the animation, so it can finish after the shot timer.
  const motion=weaponGesture(d.weaponId,d.attackAge,d.reloadPhase??1,d.reloadDuration||1);
  d.attackGesture=((d.attackGesture||0)+(motion.kick-(d.attackGesture||0))*(1-Math.exp(-dt*(d.weaponId==='shotgun'?18:32))));
  if(d.kind==='tide'||d.kind==='lingya'){motion.kick=action.drive;motion.sweep=action.follow;motion.gather=action.wind;d.attackGesture=action.drive;}
  const attackBlend=poseBlend*(d.kind==='tide'?1-dodge.weight:1),kick=isRoll?0:d.attackGesture*attackBlend,sweep=isRoll?0:motion.sweep*attackBlend,gather=isRoll?0:motion.gather*attackBlend;
  const acceleration=dt?T.MathUtils.clamp((speed-(d.previousSpeed??speed))/dt,-10,10):0;d.previousSpeed=speed;
  d.motionLean=((d.motionLean||0)+(T.MathUtils.clamp(acceleration*.006,-.045,.045)-(d.motionLean||0))*(1-Math.exp(-dt*9)));
  const recoil={rifle:.075,shotgun:.22,crossbow:.075,shuriken:-.12,fire:-.15,dark:.065,hammer:0,harpoon:-.18,boomerang:-.08}[d.weaponId];
  d.rig.rotation.x=isRoll?0:-kick*recoil+d.motionLean;
  d.rig.position.z=isRoll?0:d.kind==='tide'?.08*kick-.04*gather-(d.harpoonCombo===2?.08*sweep:0):d.kind==='lingya'?.045*kick-.03*gather:-kick*Math.abs(recoil)*.45;
  // Remove last frame's procedural arm offsets before the mixer blends a new pose.
  if(d.crossbowBaseReady)for(const [bone,rotation]of d.crossbowBase)bone.quaternion.copy(rotation);
  if(d.attackBaseReady)for(const [bone,rotation]of d.attackBase)bone.quaternion.copy(rotation);
  d.mixer.update(dt);if(d.kind==='tide'){d.slide=dodge.weight;d.rig.rotation.x+=dodge.brace;d.rig.position.y=dodge.height;}
  if(!isRoll&&Math.abs(d.gaitYaw)>.001){
    g.updateMatrixWorld(true);const chest=d.spine.getWorldQuaternion(new T.Quaternion()).normalize(),hips=d.pelvis.getWorldQuaternion(new T.Quaternion()).normalize();
    hips.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),d.gaitYaw));d.pelvis.quaternion.copy(d.pelvis.parent.getWorldQuaternion(new T.Quaternion()).normalize().invert().multiply(hips)).normalize();
    d.pelvis.updateMatrixWorld(true);d.spine.quaternion.copy(d.spine.parent.getWorldQuaternion(new T.Quaternion()).normalize().invert().multiply(chest)).normalize();
  }
  d.gun.quaternion.copy(d.gunRest);
  if(d.attackBase){
    for(const [bone,rotation]of d.attackBase)rotation.copy(bone.quaternion);d.attackBaseReady=true;
    if(d.kind==='guardian'){animateGuardian(g,t,speed,dt);if(d.cape){d.cape.quaternion.copy(d.restCape);d.cape.rotateX(.06+d.blend*.10-d.motionLean*.6);d.cape.rotateZ(-d.carryTurn*.45);d.cape.userData.wind.time.value=t;d.cape.userData.wind.run.value=d.blend;d.cape.userData.wind.turn.value=d.carryTurn;}g.visible=!(hurt>0&&Math.floor(hurt*28)%2===0);return;}
    const gesture=isRoll?0:kick;
    if(d.weaponId==='harpoon'){
      // Rear-hand thrust, torso weight transfer and the gaze staying on the target.
      d.spine.rotateY(d.harpoonCombo===1?-.36*gather+.40*gesture+.22*sweep:d.harpoonCombo===2?-.18*gather+.24*gesture-.22*sweep:-.24*gather+.26*gesture+.08*sweep);d.spine.rotateX(.07*gesture-.035*gather+d.presence.breath);d.spine.rotateZ(d.presence.shoulder*(1-action.weight));
      d.swimHead.rotateY(.12*gather-.13*gesture+d.presence.look);d.rig.position.y-=.045*gesture;
      d.aimArm.rotateX(-.28*gesture+.12*gather);d.firingForearm.rotateX(-.24*gesture);
    }else if(d.weaponId==='rifle'){
      d.aimArm.rotateX(-.16*gesture);d.firingForearm.rotateX(.24*gesture);
      d.offArm.rotateX(.14*gesture);d.offForearm.rotateX(-.22*gesture);
    }else if(d.weaponId==='shotgun'){
      const pump=isRoll?0:motion.draw;
      d.aimArm.rotateX(-.25*gesture);d.firingForearm.rotateX(.32*gesture);
      d.offArm.rotateX(.17*gesture-.25*pump);d.offForearm.rotateX(-.15*gesture+.22*pump);
      if(d.gun.userData.pump)d.gun.userData.pump.position.z=isRoll?0:-.23*pump;
    }else if(d.weaponId==='shuriken'||d.weaponId==='boomerang'){
      d.aimArm.rotateY(-.95*sweep+.25*gather);d.aimArm.rotateZ(.5*sweep);
      d.firingForearm.rotateX(-.7*gesture+.35*gather);d.firingForearm.rotateY(.4*sweep);d.offArm.rotateY(.35*sweep);d.offForearm.rotateX(-.28*gather);
      d.gun.scale.setScalar(d.weaponId==='boomerang'?.72:.65*(1-.6*gesture));
    }else if(d.weaponId==='fire'){
      d.aimArm.rotateX(-.75*gesture+.18*gather);d.firingForearm.rotateX(-.43*gesture);
      d.offArm.rotateX(-.52*sweep);d.offForearm.rotateZ(-.38*sweep);d.aimArm.rotateZ(-.16*sweep);
    }else if(d.weaponId==='dark'){
      d.aimArm.rotateY(.72*sweep);d.firingForearm.rotateX(.48*gesture-.25*gather);
      d.offArm.rotateZ(.6*sweep);d.offArm.rotateX(-.32*gather);d.offForearm.rotateY(-.55*sweep);d.offForearm.rotateX(-.35*gather);
    }
  }
  if(d.crossbowBase){for(const [bone,rotation]of d.crossbowBase)rotation.copy(bone.quaternion);d.crossbowBaseReady=true;}
  if(d.support&&poseBlend>.01&&d.aimBlend>.01){
    const s=d.support;
    const solve=(bones,hand)=>{
      const [lower,upper]=bones;bones.forEach((bone,i)=>s.start[i].copy(bone.quaternion));
      upper.getWorldPosition(s.origin);lower.getWorldPosition(s.elbow);hand.getWorldPosition(s.from);
      const a=s.origin.distanceTo(s.elbow),b=s.elbow.distanceTo(s.from),distance=T.MathUtils.clamp(s.origin.distanceTo(s.target),Math.abs(a-b)+.001,a+b-.001);
      s.axis.copy(s.target).sub(s.origin).normalize();s.goal.copy(s.origin).addScaledVector(s.axis,distance);
      g.getWorldQuaternion(s.world);s.bend.set(hand===s.hand?.6:-.6,-1,-.2).applyQuaternion(s.world);s.bend.addScaledVector(s.axis,-s.bend.dot(s.axis)).normalize();
      const along=(a*a-b*b+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,a*a-along*along));
      s.from.copy(s.elbow).sub(s.origin).normalize();s.elbow.copy(s.origin).addScaledVector(s.axis,along).addScaledVector(s.bend,height);s.to.copy(s.elbow).sub(s.origin).normalize();
      s.delta.setFromUnitVectors(s.from,s.to);upper.getWorldQuaternion(s.world);s.world.premultiply(s.delta);upper.parent.getWorldQuaternion(s.parent).invert();upper.quaternion.copy(s.parent.multiply(s.world)).normalize();upper.updateWorldMatrix(false,true);
      lower.getWorldPosition(s.origin);hand.getWorldPosition(s.from);s.from.sub(s.origin).normalize();s.to.copy(s.goal).sub(s.origin).normalize();
      s.delta.setFromUnitVectors(s.from,s.to);lower.getWorldQuaternion(s.world);s.world.premultiply(s.delta);lower.parent.getWorldQuaternion(s.parent).invert();lower.quaternion.copy(s.parent.multiply(s.world)).normalize();lower.updateWorldMatrix(false,true);
      bones.forEach((bone,i)=>{bone.quaternion.slerp(s.start[i],1-d.aimBlend*poseBlend);if(newHero){d.armHistory??=new Map();const last=d.armHistory.get(bone);if(last)bone.quaternion.copy(last.rotateTowards(bone.quaternion,dt*14));else d.armHistory.set(bone,bone.quaternion.clone());d.armHistory.get(bone).copy(bone.quaternion);bone.updateWorldMatrix(false,true);}});
    };
    // Solve toward weapon-specific hand positions; grip constraints must retain the gesture.
    const id=d.weaponId,staff=['fire','dark'].includes(id),bow=id==='crossbow',throwing=['shuriken','boomerang'].includes(id);
    d.aimArm.getWorldPosition(s.origin);d.offArm.getWorldPosition(s.target);s.target.add(s.origin).multiplyScalar(.5);const chest=s.target.clone();g.getWorldQuaternion(s.world);
    if(id==='harpoon')s.to.set(-.21+(d.harpoonCombo===1?-.18*gather+.34*kick+.12*sweep:.05*kick),-.27+.045*kick+dodge.weight*.06,.05+(d.harpoonCombo===1?.32:.49)*kick-.20*gather-(d.harpoonCombo===2?.38*sweep:0)-dodge.weight*.14);
    else if(staff)s.to.set(-.19,-.23,id==='fire'?.24+.22*kick:.22+.09*gather);
    else if(id==='boomerang')s.to.set(-.24-.25*gather+.19*kick+.13*sweep,-.18+.15*gather-.10*sweep,.18-.26*gather+.38*kick+.10*sweep);
    else if(throwing)s.to.set(-.24-.18*sweep,-.10-.14*gather,.28+.20*kick);
    else s.to.set(bow?-.16:-.08,-.20+kick*(id==='shotgun'?.06:.025),(bow?.28:.14)-kick*(id==='shotgun'?.13:.065));
    if(newHero){const step=Math.sin(d.gaitPhase*Math.PI*2)*d.blend*(1-action.weight)*(1-(dodge?.weight||0)),carry=1-d.readyBlend;
      s.to.y-=carry*(id==='boomerang'?.13:.06);if(id==='boomerang'){s.to.x-=carry*.035;s.to.z-=carry*.06;}if(id==='boomerang'){const empty=Number(!!d.boomerangAway)*(1-(d.catchReady||0))*(1-action.weight);s.to.y-=empty*.18;s.to.z-=empty*.13;s.to.y+=(d.catchReady||0)*.09;}s.to.z+=step*(id==='boomerang'?.12:.035);s.to.x+=step*.025;
    }
    s.to.applyQuaternion(s.world);s.target.add(s.to);solve([d.firingForearm,d.aimArm],s.rightHand);
    const yaw=(newHero?committedWeaponYaw(g.rotation.y,d.aimAngle,d.attackAngle,action.weight):bow?g.rotation.y:Number.isFinite(d.aimAngle)?d.aimAngle:g.rotation.y)+(id==='harpoon'&&d.harpoonCombo===1?-.62*gather+.48*kick+.27*sweep:0);
    s.world.setFromAxisAngle(s.to.set(0,1,0),yaw);
    const pitch=id==='harpoon'?-.04+(1-d.readyBlend)*.30+.08*gather-.06*kick-(d.harpoonCombo===2?.24*sweep:0)-dodge.weight*.30:staff?(id==='fire'?-.15-.4*kick:.08+.15*gather):throwing?-.2+.5*sweep+(id==='boomerang'?(1-d.readyBlend)*.48:0):-kick*(id==='shotgun'?.14:.055);
    s.world.multiply(new T.Quaternion().setFromAxisAngle(s.to.set(1,0,0),pitch));d.gun.parent.getWorldQuaternion(s.parent).invert();if(id==='boomerang')s.world.multiply(new T.Quaternion().setFromAxisAngle(s.to.set(0,0,1),-.40*gather+.48*kick+.24*sweep));if(newHero){if(d.weaponWorld)d.weaponWorld.rotateTowards(s.world,dt*12);else d.weaponWorld=s.world.clone();s.world.copy(d.weaponWorld);}d.gun.quaternion.slerp(s.parent.multiply(s.world).normalize(),poseBlend);
    if(staff||throwing){
      s.to.set(throwing?.27:id==='fire'?.24:.18+.13*Math.sin(sweep*Math.PI),throwing?-.24:id==='fire'?-.12:-.10+.12*gather,throwing?.20:id==='fire'?.45+.12*kick:.44-.12*sweep);
      if(id==='boomerang'){const free=(1-d.readyBlend)+Number(!!d.boomerangAway)*.25;s.to.y-=free*.12;s.to.z-=free*.16+Math.sin(d.gaitPhase*Math.PI*2)*d.blend*.10*(1-action.weight);s.to.x+=.06*sweep;}
      g.getWorldQuaternion(s.world);s.target.copy(chest).add(s.to.applyQuaternion(s.world));
    }else if(bow){s.target.set(0,.13,.22-.34*motion.draw);d.gun.localToWorld(s.target);}
    else{s.target.set(0,.015,.34+(id==='harpoon'?-.08*gather+.10*kick-(d.harpoonCombo===2?.12*sweep:0):0)+(d.gun.userData.pump?.position.z||0));d.gun.localToWorld(s.target);}
    solve([d.offForearm,d.offArm],s.hand);
    if(bow)drawCrossbow(d.gun,motion.draw*.34,T.MathUtils.clamp(d.reloadPhase??1,0,1));
  }
  if(d.weaponId==='boomerang')d.gun.visible=!d.boomerangAway;
  if(d.kind==='lingya'){
    // Capture the freshly mixed/solved pose; restore it before the next frame to prevent drift.
    for(const [bone,q]of d.lingyaPoseBase)q.copy(bone.quaternion);d.lingyaPoseReady=true;
    const pose=lingyaHopPose(d.dashTime||0),relative=(d.dashAngle??g.rotation.y+Math.PI/2)-g.rotation.y,lateral=Math.sin(relative),forward=Math.cos(relative),side=lateral>=0?1:-1;
    const moving=Math.sin(d.gaitPhase*Math.PI*2)*d.blend*(1-pose.air);
    d.rig.position.y=dodge.height;d.rig.rotation.x+=pose.pitch*.45+pose.bank*forward*.4;d.rig.rotation.y=pose.twist*lateral*.4;
    d.hopBank=-pose.bank*lateral*.45;d.rig.rotation.z+=d.hopBank;
    d.spine.rotateY(-.42*gather+.34*kick+.16*sweep-pose.twist*lateral*.8+moving*.045);d.spine.rotateX(.045*kick-.035*gather+d.presence.breath);d.spine.rotateZ(d.presence.shoulder*(1-pose.weight));d.swimHead.rotateY(.18*gather-.14*kick-.06*sweep);
    d.swimHead.rotateZ(-moving*.02);d.swimHead.rotateX(-pose.air*.07);
    const glance=speed<.2&&d.readyBlend<.2&&Number.isFinite(d.companionAngle)?T.MathUtils.clamp(angleDelta(d.companionAngle,g.rotation.y),-.3,.3)*Math.max(0,Math.sin(t*.8)):0;d.petGlance=(d.petGlance||0)+(glance-(d.petGlance||0))*(1-Math.exp(-dt*4));d.swimHead.rotateY(d.petGlance+d.presence.look*.5);
    d.catchTime=Math.max(0,(d.catchTime||0)-dt);const catchWeight=Math.sin(Math.PI*d.catchTime/.2);d.firingForearm.rotateX(-catchWeight*.32);d.aimArm.rotateY(catchWeight*.16);d.spine.rotateY(-catchWeight*.065);d.offForearm.rotateX(-catchWeight*.13);
    if(d.skirt){const cloth=d.skirt.children[0].userData.cloth;cloth.time.value=t;cloth.motion.value=d.blend;cloth.turn.value=d.carryTurn;cloth.hop.value=pose.air;}
    if(d.satchel){d.satchel.quaternion.copy(d.satchelRest);d.satchel.rotateX(Math.sin(t*5.4)*d.blend*.035+pose.air*.13-pose.land*.08);d.satchel.rotateZ(-moving*.06-pose.bank*lateral*.45-d.carryTurn*.7);d.satchel.rotateX(-d.motionLean*.8);}
    d.aimArm.rotateZ(-pose.air*.18);d.offArm.rotateZ(pose.air*.26);d.aimArm.rotateX(-pose.air*.18*side);d.offArm.rotateX(pose.air*.18*side);d.firingForearm.rotateX(-pose.weight*.55);d.offForearm.rotateX(-pose.weight*.65);
  }
  // Continue limiting joint velocity when IK fades out; returning to idle must not snap.
  if(newHero){d.finalArmPose??=[d.aimArm,d.firingForearm,d.offArm,d.offForearm].map(b=>[b,b.quaternion.clone()]);for(const [bone,previous]of d.finalArmPose){previous.rotateTowards(bone.quaternion,dt*14);bone.quaternion.copy(previous).normalize();}}
  if(d.cape){d.cape.quaternion.copy(d.restCape);d.cape.rotateX(.06+d.blend*.13+Math.sin(t*5)*.015-d.motionLean*.6+kick*.025);d.cape.rotateZ(-bank*.65-d.carryTurn*.6);d.cape.rotateX(-d.carryTurn*d.blend*.12);if(d.kind==='lingya'){const hop=lingyaHopPose(d.dashTime||0);d.cape.rotateX(hop.air*.13-hop.land*.07);}d.cape.userData.wind.time.value=t;d.cape.userData.wind.run.value=d.blend;d.cape.userData.wind.turn.value=d.carryTurn;}
  g.visible=!(hurt>0&&Math.floor(hurt*28)%2===0)&&!(d.kind==='tide'&&dodge.depth>.985);
}
export function disposeHero(g){
  if(!g?.userData.skinned)return;const d=g.userData,skeletons=new Set();d.mixer.stopAllAction();d.mixer.uncacheRoot(d.model);
  g.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton);});for(const s of skeletons)s.dispose();for(const o of d.owned){o.geometry.dispose();o.material.dispose();}
}

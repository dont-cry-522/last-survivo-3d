import{weaponGesture,shotStarted}from'./weapon-performance.js?v=30';
import{rollProgress,rollWeight}from'./dodge-motion.js?v=24';
import * as T from './vendor/three.module.js';
import {clone} from './vendor/SkeletonUtils.js';
import {loadCharacterData} from './character-loader.js?v=24';
import {makeHero as makePrototype} from './hero-model.js?v=30';

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
  material.color.set(0xffffff);material.metalness=0;material.roughness=.86;material.normalScale.set(.28,.28);
  material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    float skinShade=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
    diffuseColor.rgb=vec3(${kind==='silver'?'.80,.66,.60':'.63,.43,.32'})*(.72+skinShade*.42)+diffuseColor.rgb*.09;`);};
  material.customProgramCacheKey=()=> 'skin-'+kind;
}
function bindParts(root,extra,onlyHead=false,kind=''){
  const target=firstSkin(root).skeleton,bones=new Map(target.bones.map(b=>[b.name,b]));const meshes=[];
  extra.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});
  for(const m of meshes){
    if(onlyHead&&m.material.name.includes('Superhero')){
      const g=m.geometry.clone(),p=g.attributes.position,ids=g.index?.array,keep=[];
      // The source base body is continuous; retain only head and neck above the outfit collar.
      for(let i=0;i<(ids?.length||p.count);i+=3){const a=ids?ids[i]:i,b=ids?ids[i+1]:i+1,c=ids?ids[i+2]:i+2;if(Math.min(p.getY(a),p.getY(b),p.getY(c))>(kind==='silver'?1.54:1.58))keep.push(a,b,c);}
      if(kind==='silver')for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(y>1.51){const jaw=Math.exp(-(((y-1.572)/.045)**2));x*=1-.13*jaw;if(y<1.62)y+=.006*jaw;if(z>.08&&Math.abs(x)<.027&&y>1.60&&y<1.665)z-=.007*Math.exp(-(((y-1.635)/.024)**2));p.setXYZ(i,x,y,z);}}
      g.setIndex(keep);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();m.geometry=g;
    }
    const mapped=m.skeleton.bones.map(b=>bones.get(b.name));if(mapped.some(b=>!b))throw Error('角色骨骼不匹配');
    m.skeleton=new T.Skeleton(mapped,m.skeleton.boneInverses);root.add(m);
  }
}
export async function loadHeroAssets(onProgress=()=>{}){
  if(loaded)return;
  const {models:assets,clips:bakedClips}=await loadCharacterData(onProgress);
  for(const kind of ['silver','scout']){
    const root=assets[kind+'-outfit'].scene;root.skeleton=firstSkin(root).skeleton;
    root.traverse(o=>{if(o.isMesh){if(o.name.includes('Head_Hood')||kind==='silver'&&/Pauldrons|_Legs|Belt_1/.test(o.name))o.visible=false;o.material=o.material.clone();if(kind==='silver'&&o.material.name.includes('Ranger'))palette(o.material,0x526075);if(o.material.name.includes('Regular'))skinTone(o.material,kind);
      if(kind==='silver'&&o.name.includes('_Feet')){o.geometry=cutGeometry(o.geometry,(p,a,b,c)=>Math.min(p.getY(a),p.getY(b),p.getY(c))<.16);o.material=new T.MeshStandardMaterial({color:0x141c24,roughness:.57,metalness:.08});}
      if(kind==='silver'&&o.name.includes('Body')){o.geometry=o.geometry.clone();const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);p.setX(i,p.getX(i)*(1-.12*Math.exp(-(((y-1.13)/.105)**2))));}o.geometry.computeVertexNormals();}
    }});
    const base=assets[kind+'-base'].scene;base.traverse(o=>{if(o.isMesh){o.material=o.material.clone();if(o.material.name.includes('Hair'))o.material.color.set(kind==='silver'?0x65717f:0x38251d);if(o.material.name.includes('Superhero'))skinTone(o.material,kind);}});
    if(kind==='silver'){const extra=new T.Group();extra.add(hunterLegs(base));bindParts(root,extra);}
    bindParts(root,base,true,kind);
    const hair=assets[kind+'-hair'].scene;hair.traverse(o=>{if(o.isMesh){o.material=o.material.clone();if(kind==='silver'){
      o.material.color.set(0xdde7f1);o.material.roughness=.78;o.material.normalScale.set(.45,.45);
      o.material.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
        float strand=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
        diffuseColor.rgb=vec3(.69,.75,.83)*(.7+strand*.55);`);};o.material.customProgramCacheKey=()=> 'silver-hair';
    }else o.material.color.set(0x58402e);}});bindParts(root,hair);
    root.updateMatrixWorld(true);templates.set(kind,root);
  }
  for(const c of bakedClips)clips.set(c.name,c);
  loaded=true;
}
export function heroesReady(){return loaded;}
function attachAtRest(bone,object,root){
  root.updateMatrixWorld(true);object.applyMatrix4(bone.matrixWorld.clone().invert().multiply(root.matrixWorld));bone.add(object);
}
function capeMesh(){
  const pos=[],uv=[],colors=[],ix=[],cols=24,rows=28;
  for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){const u=x/cols,v=y/rows,w=.22+.13*Math.sin(v*Math.PI*.86),split=.10*Math.exp(-(((u-.5)/.065)**2))*v**8;pos.push((u-.5)*w*2,-v*.86+split+Math.cos(u*Math.PI*4)*.013*v,-.12*v-.04*Math.sin(u*Math.PI)+Math.sin(u*Math.PI*8)*.016*v);uv.push(u,v);const edge=x===0||x===cols||y===rows,color=new T.Color(edge?0x65727d:0x252936);colors.push(color.r,color.g,color.b);}
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=y*(cols+1)+x;ix.push(a,a+cols+1,a+1,a+1,a+cols+1,a+cols+2);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(ix);geometry.computeVertexNormals();
  const material=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.87,side:T.DoubleSide}),wind={time:{value:0},run:{value:0}};
  material.onBeforeCompile=s=>{s.uniforms.capeTime=wind.time;s.uniforms.capeRun=wind.run;s.vertexShader='uniform float capeTime; uniform float capeRun;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    float freeHem=clamp(-position.y/.85,0.0,1.0);
    transformed.z+=sin(position.y*9.0+capeTime*5.0)*(.009+capeRun*.026)*freeHem;
    transformed.x+=sin(capeTime*3.0+position.y*6.0)*.012*freeHem;`);};
  const m=new T.Mesh(geometry,material);m.userData.wind=wind;m.position.set(0,1.43,-.14);m.castShadow=true;m.receiveShadow=true;return m;
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
  const g=new T.Group(),rig=new T.Group(),model=clone(templates.get(kind));rig.add(model);g.add(rig);rig.scale.setScalar(1.12);
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
  const aimName=['fire','dark','shuriken'].includes(weapon)?'Spell_Simple_Idle_Loop':'Pistol_Aim_Neutral';
  const upperClip=clips.get(aimName).clone();upperClip.tracks=upperClip.tracks.filter(isUpper);upperClip.name='upper-aim';
  const aim=mixer.clipAction(upperClip);aim.play();aim.setEffectiveWeight(0);
  // Calibrate the authored weapon grip in the actual aiming pose, then return to idle.
  const fullAim=actions[aimName];fullAim.play();mixer.update(0);model.updateMatrixWorld(true);
  const hand=bones.get('hand_r'),gun=makePrototype(kind,weapon).userData.weapon;gun.removeFromParent();gun.position.set(0,.045,0);gun.scale.setScalar(weapon==='crossbow'?.72:.65);gun.quaternion.copy(hand.getWorldQuaternion(new T.Quaternion()).invert());hand.add(gun);
  fullAim.stop();idle.play();upperIdle.play();run.play().setEffectiveWeight(0);upperRun.play().setEffectiveWeight(0);mixer.update(0);
  for(const a of[walk,upperWalk,backRun,backWalk])a.play().setEffectiveWeight(0);
  model.skeleton.pose();model.updateMatrixWorld(true);
  const owned=[];let cape;
  if(kind==='silver'){
    cape=capeMesh();owned.push(cape);attachAtRest(bones.get('spine_03'),cape,model);
    const mask=faceMask();owned.push(mask);attachAtRest(bones.get('Head'),mask,model);
  }
  // Slightly larger head silhouette remains legible from the elevated game camera.
  bones.get('Head')?.scale.setScalar(1.08);
  mixer.update(0);const restCape=cape?.quaternion.clone();
  Object.assign(g.userData,{skinned:true,kind,weaponId:weapon,rig,model,mixer,actions,idle,run,walk,upperIdle,upperRun,upperWalk,backRun,backWalk,aim,gun,gunRest:gun.quaternion.clone(),aimArm:bones.get('upperarm_r'),firingForearm:bones.get('lowerarm_r'),offArm:bones.get('upperarm_l'),offForearm:bones.get('lowerarm_l'),pelvis:bones.get('pelvis'),spine:bones.get('spine_01'),cape,restCape,owned,blend:0,aimBlend:0,aimHold:0,smoothedSpeed:0,backBlend:0,gaitYaw:0,gaitPhase:0,reloadPhase:1});
  g.userData.support={hand:bones.get('hand_l'),rightHand:bones.get('hand_r'),elbow:new T.Vector3(),goal:new T.Vector3(),axis:new T.Vector3(),bend:new T.Vector3(),target:new T.Vector3(),origin:new T.Vector3(),from:new T.Vector3(),to:new T.Vector3(),delta:new T.Quaternion(),world:new T.Quaternion(),parent:new T.Quaternion(),start:[new T.Quaternion(),new T.Quaternion()]};
  if(weapon==='crossbow')g.userData.crossbowBase=[g.userData.aimArm,g.userData.firingForearm,g.userData.offArm,g.userData.offForearm].map(bone=>[bone,new T.Quaternion()]);
  else g.userData.attackBase=[g.userData.aimArm,g.userData.firingForearm,g.userData.offArm,g.userData.offForearm].map(bone=>[bone,new T.Quaternion()]);
  return g;
}
export function animateSkinnedHero(g,t,speed,attack,hurt){
  const d=g.userData,dt=d.lastTime===undefined?1/60:Math.max(0,Math.min(.05,t-d.lastTime));d.lastTime=t;
  d.smoothedSpeed+=(speed-d.smoothedSpeed)*(1-Math.exp(-dt*(speed>0?15:22)));
  d.blend+=(Math.min(1,speed/1.6)-d.blend)*(1-Math.exp(-dt*(speed>0?14:18)));
  d.aimHold=attack>0||d.aimActive?.45:Math.max(0,d.aimHold-dt);d.aimBlend+=((d.aimHold>0?1:0)-d.aimBlend)*(1-Math.exp(-dt*(d.weaponId==='crossbow'?8:20)));
  const relative=Number.isFinite(d.travelAngle)?angleDelta(d.travelAngle,g.rotation.y):0,backward=Math.abs(relative)>Math.PI*.55;
  d.backBlend+=((backward?1:0)-d.backBlend)*(1-Math.exp(-dt*12));
  const gaitTarget=speed>.1?T.MathUtils.clamp(angleDelta(relative,backward?Math.PI:0),-.85,.85):0;d.gaitYaw+=(gaitTarget-d.gaitYaw)*(1-Math.exp(-dt*12));
  const jogging=T.MathUtils.smoothstep(d.smoothedSpeed,2.2,4.6),runWeight=d.blend*jogging,walkWeight=d.blend*(1-jogging),upperFree=1-d.aimBlend;
  d.run.setEffectiveWeight(runWeight*(1-d.backBlend));d.backRun.setEffectiveWeight(runWeight*d.backBlend);d.walk.setEffectiveWeight(walkWeight*(1-d.backBlend));d.backWalk.setEffectiveWeight(walkWeight*d.backBlend);d.idle.setEffectiveWeight(1-d.blend);
  d.upperRun.setEffectiveWeight(runWeight*upperFree);d.upperWalk.setEffectiveWeight(walkWeight*upperFree);d.upperIdle.setEffectiveWeight((1-d.blend)*upperFree);
  const strideScale=d.rig.scale.y/1.23;
  const cadence=T.MathUtils.lerp(d.smoothedSpeed/2.5/d.walk.getClip().duration,d.smoothedSpeed/5.8/d.run.getClip().duration,jogging)/strideScale;d.gaitPhase=(d.gaitPhase+dt*cadence)%1;
  for(const a of[d.run,d.backRun,d.upperRun,d.walk,d.backWalk,d.upperWalk]){a.paused=true;a.time=d.gaitPhase*a.getClip().duration;}d.aim.setEffectiveWeight(d.aimBlend);
  const isRoll=d.kind==='scout'&&d.dashTime>0,roll=d.actions.Roll,weight=isRoll?rollWeight(d.dashTime):0,poseBlend=1-weight;
  if(isRoll){roll.enabled=true;roll.setLoop(T.LoopOnce,1);roll.clampWhenFinished=true;roll.play();roll.setEffectiveWeight(weight);roll.paused=true;roll.time=rollProgress(d.dashTime)*roll.getClip().duration;for(const a of[d.idle,d.run,d.walk,d.backRun,d.backWalk,d.upperIdle,d.upperRun,d.upperWalk,d.aim])a.setEffectiveWeight(a.getEffectiveWeight()*poseBlend);}else roll.stop();
  const bank=isRoll?0:T.MathUtils.clamp(-(d.turnRate||0)*.008,-.075,.075)*d.blend;d.rig.rotation.z+=(bank-d.rig.rotation.z)*(1-Math.exp(-dt*10));
  // Recovery belongs to the animation, so it can finish after the shot timer.
  const fired=shotStarted(d,attack,d.previousAttack||0);d.previousAttack=attack;
  d.attackAge=fired?0:(d.attackAge??2)+dt;
  const motion=weaponGesture(d.weaponId,d.attackAge,d.reloadPhase??1,d.reloadDuration||1);
  d.attackGesture=((d.attackGesture||0)+(motion.kick-(d.attackGesture||0))*(1-Math.exp(-dt*(d.weaponId==='shotgun'?18:32))));
  const kick=isRoll?0:d.attackGesture,sweep=isRoll?0:motion.sweep,gather=isRoll?0:motion.gather;
  const acceleration=dt?T.MathUtils.clamp((speed-(d.previousSpeed??speed))/dt,-10,10):0;d.previousSpeed=speed;
  d.motionLean=((d.motionLean||0)+(T.MathUtils.clamp(acceleration*.006,-.045,.045)-(d.motionLean||0))*(1-Math.exp(-dt*9)));
  const recoil={rifle:.075,shotgun:.22,crossbow:.075,shuriken:-.12,fire:-.15,dark:.065}[d.weaponId];
  d.rig.rotation.x=isRoll?0:-kick*recoil+d.motionLean;
  d.rig.position.z=isRoll?0:-kick*Math.abs(recoil)*.45;
  // Remove last frame's procedural arm offsets before the mixer blends a new pose.
  if(d.crossbowBaseReady)for(const [bone,rotation]of d.crossbowBase)bone.quaternion.copy(rotation);
  if(d.attackBaseReady)for(const [bone,rotation]of d.attackBase)bone.quaternion.copy(rotation);
  d.mixer.update(dt);
  if(!isRoll&&Math.abs(d.gaitYaw)>.001){
    g.updateMatrixWorld(true);const chest=d.spine.getWorldQuaternion(new T.Quaternion()).normalize(),hips=d.pelvis.getWorldQuaternion(new T.Quaternion()).normalize();
    hips.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),d.gaitYaw));d.pelvis.quaternion.copy(d.pelvis.parent.getWorldQuaternion(new T.Quaternion()).normalize().invert().multiply(hips)).normalize();
    d.pelvis.updateMatrixWorld(true);d.spine.quaternion.copy(d.spine.parent.getWorldQuaternion(new T.Quaternion()).normalize().invert().multiply(chest)).normalize();
  }
  d.gun.quaternion.copy(d.gunRest);
  if(d.attackBase){
    for(const [bone,rotation]of d.attackBase)rotation.copy(bone.quaternion);d.attackBaseReady=true;
    const gesture=isRoll?0:kick;
    if(d.weaponId==='rifle'){
      d.aimArm.rotateX(-.16*gesture);d.firingForearm.rotateX(.24*gesture);
      d.offArm.rotateX(.14*gesture);d.offForearm.rotateX(-.22*gesture);
    }else if(d.weaponId==='shotgun'){
      const pump=isRoll?0:motion.draw;
      d.aimArm.rotateX(-.25*gesture);d.firingForearm.rotateX(.32*gesture);
      d.offArm.rotateX(.17*gesture-.25*pump);d.offForearm.rotateX(-.15*gesture+.22*pump);
      if(d.gun.userData.pump)d.gun.userData.pump.position.z=isRoll?0:-.23*pump;
    }else if(d.weaponId==='shuriken'){
      d.aimArm.rotateY(-.95*sweep+.25*gather);d.aimArm.rotateZ(.5*sweep);
      d.firingForearm.rotateX(-.7*gesture+.35*gather);d.firingForearm.rotateY(.4*sweep);d.offArm.rotateY(.35*sweep);d.offForearm.rotateX(-.28*gather);
      d.gun.scale.setScalar(.65*(1-.6*gesture));
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
      bones.forEach((bone,i)=>bone.quaternion.slerp(s.start[i],1-d.aimBlend*poseBlend));
    };
    // Solve toward weapon-specific hand positions; grip constraints must retain the gesture.
    const id=d.weaponId,staff=['fire','dark'].includes(id),bow=id==='crossbow',throwing=id==='shuriken';
    d.aimArm.getWorldPosition(s.origin);d.offArm.getWorldPosition(s.target);s.target.add(s.origin).multiplyScalar(.5);const chest=s.target.clone();g.getWorldQuaternion(s.world);
    if(staff)s.to.set(-.19,-.23,id==='fire'?.24+.22*kick:.22+.09*gather);
    else if(throwing)s.to.set(-.24-.18*sweep,-.10-.14*gather,.28+.20*kick);
    else s.to.set(bow?-.16:-.08,-.20+kick*(id==='shotgun'?.06:.025),(bow?.28:.14)-kick*(id==='shotgun'?.13:.065));
    s.to.applyQuaternion(s.world);s.target.add(s.to);solve([d.firingForearm,d.aimArm],s.rightHand);
    const yaw=bow?g.rotation.y:Number.isFinite(d.aimAngle)?d.aimAngle:g.rotation.y;
    s.world.setFromAxisAngle(s.to.set(0,1,0),yaw);
    const pitch=staff?(id==='fire'?-.15-.4*kick:.08+.15*gather):throwing?-.2+.5*sweep:-kick*(id==='shotgun'?.14:.055);
    s.world.multiply(new T.Quaternion().setFromAxisAngle(s.to.set(1,0,0),pitch));d.gun.parent.getWorldQuaternion(s.parent).invert();d.gun.quaternion.slerp(s.parent.multiply(s.world).normalize(),poseBlend);
    if(staff||throwing){
      s.to.set(throwing?.27:id==='fire'?.24:.18+.13*Math.sin(sweep*Math.PI),throwing?-.24:id==='fire'?-.12:-.10+.12*gather,throwing?.20:id==='fire'?.45+.12*kick:.44-.12*sweep);
      g.getWorldQuaternion(s.world);s.target.copy(chest).add(s.to.applyQuaternion(s.world));
    }else if(bow){s.target.set(0,.13,.22-.34*motion.draw);d.gun.localToWorld(s.target);}
    else{s.target.set(0,.015,.34+(d.gun.userData.pump?.position.z||0));d.gun.localToWorld(s.target);}
    solve([d.offForearm,d.offArm],s.hand);
    if(bow)drawCrossbow(d.gun,motion.draw*.34,T.MathUtils.clamp(d.reloadPhase??1,0,1));
  }
  if(d.cape){d.cape.quaternion.copy(d.restCape);d.cape.rotateX(.06+d.blend*.13+Math.sin(t*5)*.015-d.motionLean*.6+kick*.025);d.cape.rotateZ(-bank*.65);d.cape.userData.wind.time.value=t;d.cape.userData.wind.run.value=d.blend;}
  g.visible=!(hurt>0&&Math.floor(hurt*28)%2===0);
}
export function disposeHero(g){
  if(!g?.userData.skinned)return;const d=g.userData,skeletons=new Set();d.mixer.stopAllAction();d.mixer.uncacheRoot(d.model);
  g.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton);});for(const s of skeletons)s.dispose();for(const o of d.owned){o.geometry.dispose();o.material.dispose();}
}

const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'../../mobile-check/node_modules/playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const p=await b.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.TEST_URL||'http://127.0.0.1:8898/');await p.waitForFunction(()=>window.game3d,null,{polling:100,timeout:90000});
 const result=await p.evaluate(async()=>{
  const T=await import('./vendor/three.module.js'),{animateActor}=await import('./world.js?v=84');const check=(v,m)=>{if(!v)throw Error(m)},out=[];
  for(let i=0;i<3;i++){
   game3d.select('silver','forest',i);const h=game3d.hero,d=h.userData,mask=h.getObjectByName('silver-face-mask');check(mask?.parent===d.swimHead,'mask detached from head');
   let skin;h.traverse(o=>{if(o.isSkinnedMesh&&o.material.name.includes('Superhero'))skin=o});
   const face=new T.Mesh(skin.geometry,new T.MeshBasicMaterial({side:T.DoubleSide})),cover=new T.Mesh(mask.geometry,face.material),ray=new T.Raycaster();face.updateMatrixWorld();cover.updateMatrixWorld();let maxGap=0;
   const pos=mask.geometry.attributes.position;for(let n=0;n<pos.count;n++){ray.set(new T.Vector3(pos.getX(n),pos.getY(n),1),new T.Vector3(0,0,-1));const hit=ray.intersectObject(face)[0];check(hit,'mask extends beyond face');const gap=pos.getZ(n)-hit.point.z;maxGap=Math.max(maxGap,gap);check(gap>.002&&gap<.028,'mask floats away from face or clips through it');}
   for(const [x,y,covered]of[[0,1.64,true],[.03,1.625,true],[-.03,1.625,true],[0,1.58,true],[.03,1.675,false],[-.03,1.675,false]]){ray.set(new T.Vector3(x,y,1),new T.Vector3(0,0,-1));check(!!ray.intersectObject(cover)[0]===covered,'nose/cheek/eye coverage wrong');}
   mask.updateMatrix();const rest=mask.matrix.clone();let t=0;for(const [speed,attack,depth]of[[0,0,0],[5.5,0,0],[5.5,1,0],[2,1,.8]]){d.waterDepth=depth;for(let n=0;n<60;n++){animateActor(h,t+=1/60,speed,attack);h.updateMatrixWorld(true);check(mask.matrixWorld.elements.every(Number.isFinite),'invalid animated mask');check(mask.matrix.elements.every((v,j)=>Math.abs(v-rest.elements[j])<1e-8),'mask drifts relative to head');}}
   face.material.dispose();out.push({weapon:d.weaponId,maxGap});
  }
  game3d.select('silver','forest',0);return out;
 });assert.deepEqual(errors,[]);console.log('PASS fitted nose/cheek coverage, uncovered eyes, no floating shell, head attachment in idle/run/attack/swim: '+JSON.stringify(result));
 for(const map of['forest','snow','ash']){await p.evaluate(map=>game3d.select('silver',map,0),map);await p.screenshot({path:'../../outputs/v82-silver-'+map+'.png'});}
 await p.locator('#start').click();assert.equal(await p.evaluate(()=>game3d.state),'playing');assert(await p.evaluate(()=>game3d.hero.getObjectByName('silver-face-mask').visible));assert.equal(await p.evaluate(()=>game3d.world.group.parent.children.filter(o=>o.isPointLight).length),0,'preview fill leaked into combat');
 console.log('PASS real scene preview and combat mask');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});

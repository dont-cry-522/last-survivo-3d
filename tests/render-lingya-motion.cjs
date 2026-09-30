const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),fs=require('node:fs');
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const p=await b.newPage({viewport:{width:1600,height:1290}});await p.goto(process.env.TEST_URL||'http://127.0.0.1:8899/');await p.waitForFunction(()=>window.game3d&&!document.querySelector('#start').disabled,null,{polling:100,timeout:60000});
 const frames=await p.evaluate(async()=>{const T=await import('./vendor/three.module.js'),{createSkinnedHero,animateSkinnedHero,disposeHero}=await import('./skinned-hero.js?v=81'),{makeBadger,animateBadger}=await import('./beast-model.js?v=81');
 const scene=new T.Scene(),r=new T.WebGLRenderer({antialias:true});scene.background=new T.Color(0x29453c);r.setSize(400,400);r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.1;scene.add(new T.HemisphereLight(0xe6f3de,0x3d3b32,2.6));const l=new T.DirectionalLight(0xffedcf,3);l.position.set(3,6,4);scene.add(l);const c=new T.PerspectiveCamera(31,1,.1,30);c.position.set(2.3,1.9,4.5);c.lookAt(-.2,.8,.1);const out=[];
 for(const [name,action,end,direction=Math.PI/2]of[['嗅地探索','sniff',1.5],['抬头张望','look',1.5],['慢步游走','walk',1.5],['奔跑归队','run',1.5],['压低身体','pet',1.22],['扑出伸爪','pet',1.42],['落地缓冲','pet',1.70],['回旋镖挥臂','throw',1.18],['燕步蹬地','hop',1.04],['燕步腾空','hop',1.20],['燕步落地','hop',1.43],['恢复站姿','hop',1.8],['左侧避让','hop',1.20,-Math.PI/2],['后撤避让','hop',1.20,Math.PI],['前跃避让','hop',1.20,0],['斜向落地','hop',1.37,Math.PI/4]]){
  const g=createSkinnedHero('lingya','boomerang'),pet=makeBadger();pet.position.set(-.8,0,.3);scene.add(g,pet);for(let i=0;i<=end*60;i++){const t=i/60,d=g.userData;let state=action,speed=action==='run'?6:action==='walk'?1.6:0,progress=0;
   if(action==='hop'){d.dashTime=t>=1?Math.max(0,.48-(t-1)):0;d.dashAngle=direction;state='look';}
   if(action==='throw'&&t>=1){d.shotSerial=1;d.reloadDuration=.8;d.reloadPhase=(t-1)/.8;d.aimActive=true;d.boomerangAway=t>1.13;state='look';}
   if(action==='pet'){state=t<1?'look':t<1.28?'wind':t<1.58?'pounce':'recover';progress=state==='wind'?(t-1)/.28:state==='pounce'?(t-1.28)/.3:state==='recover'?(t-1.58)/.34:0;}
   animateSkinnedHero(g,t,action==='run'?4:action==='walk'?1.5:0,0,0);pet.position.z=.3+speed*t;animateBadger(pet,t,speed,state,Math.min(1,progress));
  }
  pet.position.z=.3;scene.updateMatrixWorld(true);g.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update()});r.render(scene,c);out.push({name,src:r.domElement.toDataURL()});scene.remove(g,pet);disposeHero(g);
 }r.dispose();return out;});
 await p.setContent('<style>body{margin:0;background:#29453c;color:#e8dbc4;font:19px system-ui;display:grid;grid-template-columns:repeat(4,1fr)}figure{margin:0;height:430px;text-align:center}img{width:400px;height:400px}</style>'+frames.map(v=>`<figure><img src="${v.src}"><figcaption>${v.name}</figcaption></figure>`).join(''));await p.screenshot({path:process.env.OUTPUT_DIR+'/lingya-v51-motion.png',fullPage:true});console.log('Rendered Lingya and badger action phases');
 }finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});

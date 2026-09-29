const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const p=await b.newPage({viewport:{width:1440,height:1280}});await p.goto(process.env.TEST_URL||'http://127.0.0.1:8899/');
 const frames=await p.evaluate(async()=>{const T=await import('./vendor/three.module.js'),{makeBadger,animateBadger}=await import('./beast-model.js?v=76');
  const scene=new T.Scene(),r=new T.WebGLRenderer({antialias:true});r.setSize(360,290);r.toneMapping=T.ACESFilmicToneMapping;scene.background=new T.Color(0x29453c);scene.add(new T.HemisphereLight(0xe6f3de,0x3d3b32,2.6));const light=new T.DirectionalLight(0xffedcf,3);light.position.set(3,6,4);scene.add(light);
  const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:0x29453c,roughness:1}));floor.rotation.x=-Math.PI/2;scene.add(floor);
  const c=new T.PerspectiveCamera(31,360/290,.1,300),out=[];
  for(const [label,state,speed,end]of[['慢步 · 承重','roam',1.15,2],['慢步 · 提脚','roam',1.15,2.15],['慢步 · 前伸','roam',1.15,2.3],['慢步 · 落脚','roam',1.15,2.45],['追赶 1','return',6,2],['追赶 2','return',6,2.09],['追赶 3','return',6,2.18],['追赶 4','return',6,2.27],['嗅探','sniff',0,.8],['嗅探后停顿','sniff',0,2],['抬头观察','look',0,3.5],['回望','look',0,6.8],['刹步','stop',3,1.05],['收回后脚','stop',3,1.2],['稳住重心','stop',3,1.4],['安静待命','stop',3,2.4]]){
   const g=makeBadger();scene.add(g);for(let i=0;i<=Math.round(end*60);i++){const t=i/60,v=state==='stop'&&t>=1?0:speed;g.position.z+=v/60;animateBadger(g,t,v,state==='stop'?'look':state);}
   c.position.set(1.5,1.2,g.position.z+2.9);c.lookAt(0,.35,g.position.z);scene.updateMatrixWorld(true);r.render(scene,c);out.push({label,src:r.domElement.toDataURL()});scene.remove(g);
  }r.dispose();return out;
 });
 await p.setContent('<style>body{margin:0;background:#29453c;color:#e8dbc4;font:17px system-ui;display:grid;grid-template-columns:repeat(4,1fr)}figure{margin:0;height:320px;text-align:center}img{width:360px;height:290px}</style>'+frames.map(f=>`<figure><img src="${f.src}"><figcaption>${f.label}</figcaption></figure>`).join(''));
 await p.screenshot({path:process.env.OUTPUT_DIR+'/badger-v51-motion.png',fullPage:true});console.log('Rendered walking, catch-up, idle holds and stop transition');
 }finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});

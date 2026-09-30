const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'../../mobile-check/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const p=await b.newPage();await p.goto(process.env.TEST_URL||'http://127.0.0.1:8897/');await p.waitForFunction(()=>!!window.game3d,null,{polling:100,timeout:90000});
 const frames=await p.evaluate(async mode=>{
  const T=await import('./vendor/three.module.js'),{createSkinnedHero,animateSkinnedHero,disposeHero}=await import('./skinned-hero.js?v=87'),{makeWraith,animateWraith}=await import('./wraith-model.js?v=87');
  const scene=new T.Scene(),r=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setSize(400,400);r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.1;scene.background=new T.Color(0x34483f);scene.add(new T.HemisphereLight(0xeaf0df,0x3b3830,2.5));const light=new T.DirectionalLight(0xffe5bf,3);light.position.set(3,6,4);scene.add(light);const c=new T.PerspectiveCamera(28,1,.01,20),out=[];
  for(const [kind,weapon]of [['scout','rifle'],['scout','shotgun'],['scout','fire'],['silver','crossbow'],['silver','shuriken'],['silver','dark'],['guardian','hammer'],['tide','harpoon'],['lingya','boomerang'],['wraith','shade'],['wraith','shadowblade'],['wraith','grimoire']]){
   const g=kind==='wraith'?makeWraith(weapon):createSkinnedHero(kind,weapon),d=g.userData,animate=kind==='wraith'?animateWraith:animateSkinnedHero;scene.add(g);d.aimActive=mode!=="idle";d.aimAngle=0;
   for(let i=0;i<90;i++)animate(g,i/60,mode==="run"?5:0,0,0);if(mode==="draw"){d.shotSerial=1;d.reloadDuration=1;for(let i=90;i<113;i++){d.reloadPhase=(i-90)/60;animate(g,i/60,0,i===90?.2:0,0);}}g.updateMatrixWorld(true);g.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update()});
   const y=kind==='lingya'?.85:kind==='wraith'?.65:1.24;c.position.set(1.1,y+.4,2.4);c.lookAt(0,y,.16);r.render(scene,c);out.push({name:kind+' / '+weapon,src:r.domElement.toDataURL()});scene.remove(g);if(kind!=='wraith')disposeHero(g);
  }
  r.dispose();return out;
 },process.env.MODE||"aim");
 await p.setViewportSize({width:1600,height:1290});await p.setContent('<style>body{margin:0;background:#34483f;color:#ead9ba;font:17px system-ui;display:grid;grid-template-columns:repeat(4,400px)}figure{margin:0;height:430px;text-align:center}img{width:400px;height:400px}</style>'+frames.map(v=>`<figure><img src="${v.src}"><figcaption>${v.name}</figcaption></figure>`).join(''));await p.screenshot({path:'../../outputs/v85-grips-'+(process.env.STAGE||'after')+'.png',fullPage:true});console.log('Rendered twelve weapon grips');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});

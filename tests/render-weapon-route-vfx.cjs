const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'../../mobile-check/node_modules/playwright');
const path=require('node:path'),os=require('node:os'),fs=require('node:fs');
const output=process.env.OUTPUT_DIR||path.join(os.tmpdir(),'weapon-route-vfx-review');
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:8899/',{waitUntil:'domcontentloaded'});
  const frames=await page.evaluate(async()=>{
   const T=await import('./vendor/three.module.js'),{SkillVFX}=await import('./skill-vfx.js'),{weaponRouteEffect,WEAPON_ROUTE_LOOKS}=await import('./weapon-route-vfx.js');
   const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(360,250);renderer.setPixelRatio(1);
   const camera=new T.PerspectiveCamera(37,360/250,.1,30);camera.position.set(3.4,4.5,5.8);camera.lookAt(0,.65,0);
   const scene=new T.Scene(),floor=new T.Mesh(new T.PlaneGeometry(40,40),new T.MeshBasicMaterial());floor.rotation.x=-Math.PI/2;floor.position.y=-.015;scene.add(floor);
   const dummy=new T.Group(),body=new T.Mesh(new T.CapsuleGeometry(.23,.6,4,8),new T.MeshBasicMaterial({color:0x624b42})),head=new T.Mesh(new T.SphereGeometry(.2,9,6),new T.MeshBasicMaterial({color:0x8e7660}));body.position.y=.55;head.position.y=1.02;dummy.add(body,head);scene.add(dummy);
   const contactShadow=new T.Mesh(new T.CircleGeometry(.37,24),new T.MeshBasicMaterial({color:0x202c27,transparent:true,opacity:.18}));contactShadow.rotation.x=-Math.PI/2;contactShadow.position.y=.002;scene.add(contactShadow);
   const v=new SkillVFX(scene,{mobile:true}),out=[];
   for(const [ground,color] of [['林地',0x536a48],['雪地',0x96b7bd]]){
    scene.background=new T.Color(color);floor.material.color.set(color);
    for(const [id,look] of Object.entries(WEAPON_ROUTE_LOOKS)){
     const phase=({rifle_rapid:'cast',shotgun_fan:'cast',shuriken_fan:'cast',shuriken_return:'turn',dark_gravity:'field',shade_echo:'bounce',shade_blight:'mark',shadowblade_fan:'cast',shadowblade_return:'turn',grimoire_echo:'echo',boomerang_pincer:'pet',boomerang_snare:'trap'})[id]||'hit';
     v.clear();dummy.visible=!['cast','turn','field','trap'].includes(phase);contactShadow.visible=dummy.visible;
     const w={id:look.weapon,pathId:id,pathRank:3},detail={combo:2,empowered:true,returning:true,targetSize:.55,stage:'snap',x2:-1.15,z2:-.8};
     weaponRouteEffect(v,w,phase,0,0,.2,detail);v.update(id==='rifle_rapid'?.022:.065);renderer.render(scene,camera);
     out.push({ground,name:look.name,phase,count:v.active.length,src:renderer.domElement.toDataURL()});
    }
   }
   v.clear();renderer.dispose();return out;
  });
  await page.goto('about:blank');
  for(const ground of ['林地','雪地']){
   await page.setContent('<style>body{margin:0;background:#20322a;color:#eadfc9;font:16px system-ui;display:grid;grid-template-columns:repeat(4,360px)}figure{margin:0;height:286px;text-align:center}img{display:block;width:360px;height:250px}figcaption{padding-top:6px}small{color:#a8b4a7}</style>'+frames.filter(f=>f.ground===ground).map(f=>`<figure><img src="${f.src}"><figcaption>${f.name} <small>${f.phase} · ${f.count}件</small></figcaption></figure>`).join(''));
   const filename=path.join(output,'weapon-routes-'+(ground==='林地'?'forest':'snow')+'.png');await page.screenshot({path:filename,fullPage:true});console.log(filename);
  }
  if(errors.length)throw Error(errors.join('\n'));
  console.log('Rendered 24 route effects on forest and snow terrain; no browser errors.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});

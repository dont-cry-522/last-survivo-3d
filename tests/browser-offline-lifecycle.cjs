const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs');
const template=fs.readFileSync('scripts/offline-worker.txt','utf8'),client=fs.readFileSync('offline.js','utf8');let release=1,broken=true;
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://local').pathname;res.setHeader('Cache-Control','no-store');
 if(pathname==='/'||pathname==='/index.html'){
  res.setHeader('Content-Type','text/html');res.end(`<body data-release="${release}"><p id="offline-status"></p><button id="offline-download">Download</button><button id="offline-install" hidden>Install</button><script type="module" src="offline.js?v=88"></script></body>`);
 }else if(pathname==='/offline.js'){res.setHeader('Content-Type','text/javascript');res.end(client);}
 else if(pathname==='/sw.js'){res.setHeader('Content-Type','text/javascript');res.end(template.replace('__VERSION__','"83"').replace('__BUILD__',JSON.stringify('fixture-'+release)).replace('__FILES__','["index.html","offline.js","resource.bin"] ').replace('__BYTES__','100'));}
 else if(pathname==='/resource.bin'){res.statusCode=broken?503:200;res.end('resource');}
 else {res.statusCode=404;res.end();}
});
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(`http://127.0.0.1:${server.address().port}/`);
 const saved=()=>p.waitForFunction(()=>document.querySelector('#offline-status').textContent.includes('已准备好'),null,{timeout:20000});
 const failed=()=>p.waitForFunction(()=>document.querySelector('#offline-status').textContent.includes('未完成'),null,{timeout:20000});
 await p.locator('#offline-download').click();await failed();assert.equal(await p.evaluate(()=>!!navigator.serviceWorker.controller),false);
 broken=false;await p.locator('#offline-download').click();await saved();await p.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await p.evaluate(()=>{localStorage.setItem('save','keep');window.playMarker='keep';});release=2;broken=true;
 await p.locator('#offline-download').click();await failed();assert.equal(await p.getAttribute('body','data-release'),'1');assert.equal(await p.evaluate(()=>window.playMarker),'keep');
 const ready=await p.evaluate(()=>new Promise(resolve=>{const channel=new MessageChannel();channel.port1.onmessage=e=>resolve(e.data.ready);navigator.serviceWorker.controller.postMessage({type:'STATUS'},[channel.port2]);}));assert(ready,'failed update damaged existing offline cache');
 broken=false;await p.locator('#offline-download').click();await p.waitForFunction(()=>document.querySelector('#offline-download').textContent.includes('启用新版'),null,{timeout:20000});
 assert.equal(await p.evaluate(()=>window.playMarker),'keep','download automatically interrupted the running page');assert.equal(await p.getAttribute('body','data-release'),'1');
 await p.locator('#offline-download').click();await p.waitForFunction(()=>document.body.dataset.release==='2',null,{timeout:20000});await saved();assert.equal(await p.evaluate(()=>localStorage.getItem('save')),'keep');assert.deepEqual(errors,[]);
 console.log('PASS offline lifecycle: failed install/retry, failed update preserves old game, complete update waits for explicit reload, save preserved');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exit(1);});

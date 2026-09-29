import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
const template=readFileSync(new URL('../scripts/offline-worker.txt',import.meta.url),'utf8');
function harness({fail=false}={}){
 const handlers={},stores=new Map(),fetched=[],scope='https://example.test/game/';let broken=fail;
 const cacheApi={async open(name){if(!stores.has(name))stores.set(name,new Map());const data=stores.get(name);return {
  async keys(){return [...data.keys()].map(url=>({url}));},async match(url){return data.get(String(url))?.clone();},async put(url,response){data.set(String(url),response.clone());}
 };},async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);}};
 const sandbox={URL,Response,AbortController,setTimeout,clearTimeout,caches:cacheApi,
  fetch:async url=>{fetched.push(String(url));if(broken&&String(url).includes('main.js'))throw Error('interrupted');return new Response('resource',{status:200,headers:{'content-type':String(url).includes('index.html')?'text/html':'text/javascript'}});},
  self:{location:{href:scope+'sw.js'},clients:{async matchAll(){return [];},async claim(){}},async skipWaiting(){sandbox.activated=true;},addEventListener(type,fn){handlers[type]=fn;}}
 };
 vm.runInNewContext(template.replace('__VERSION__','"77"').replace('__BUILD__','"77-test"').replace('__FILES__','["index.html","main.js","assets/model.bin"] ').replace('__BYTES__','123'),sandbox);
 return {handlers,stores,fetched,scope,fix(){broken=false;},async install(){let promise;handlers.install({waitUntil:p=>promise=p});await promise;},async status(){let promise,result;handlers.message({data:{type:'STATUS'},ports:[{postMessage:r=>result=r}],waitUntil:p=>promise=p});await promise;return result;},async request(path,mode){let response;handlers.fetch({request:{url:scope+path,method:'GET',mode},respondWith:r=>response=r});return response&&await response;}};
}
test('offline resource list is reproducible and includes compressed and fallback character assets',()=>{
 const result=spawnSync(process.execPath,['scripts/build-offline.mjs','--check'],{cwd:new URL('../',import.meta.url),encoding:'utf8'});assert.equal(result.status,0,result.stderr);
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');assert(sw.includes('tide-outfit.bin'));assert(sw.includes('motion-e416bf7efde8.json'));assert(sw.includes('assets/bestiary/tidecrab.png'));assert(sw.includes('offline.js'));assert(!sw.includes('undefined/'));
 const manifest=JSON.parse(readFileSync(new URL('../manifest.webmanifest',import.meta.url)));assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./');assert.equal(manifest.display,'standalone');
});
test('incomplete installation cannot report ready or replace an existing offline release',async()=>{
 const h=harness({fail:true});h.stores.set('forest3d-offline:/game/:76-old',new Map());h.stores.set('other-game',new Map());
 await assert.rejects(h.install());assert(h.stores.has('forest3d-offline:/game/:76-old'));assert(h.stores.has('other-game'));assert(!h.stores.has('forest3d-offline:/game/:77-test'));
 assert.equal((await h.status()).ready,false);h.fix();await h.install();assert.equal((await h.status()).ready,true);
});
test('offline navigation and current modules use cache without network, future modules never get stale code',async()=>{
 const h=harness();await h.install();h.fetched.length=0;
 assert.equal(await (await h.request('?v=999','navigate')).text(),'resource');assert.equal(await (await h.request('index.html','navigate')).text(),'resource');assert.equal(await (await h.request('main.js?v=77','cors')).text(),'resource');assert.equal(h.fetched.length,0);
 assert.equal(await h.request('main.js?v=78','cors'),undefined);assert.equal(await h.request('unknown','navigate'),undefined);
 assert.equal(await (await h.request('assets/model.bin?v=42','cors')).text(),'resource');assert.equal(h.fetched.length,0);
 const data=h.stores.get('forest3d-offline:/game/:77-test');data.delete(h.scope+'assets/model.bin');assert.equal((await h.status()).ready,false);
});

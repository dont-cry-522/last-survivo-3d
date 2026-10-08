import{test}from'node:test';
import assert from'node:assert/strict';
import{RecordedEffects}from'../recorded-effects.js';

const cues={'crossbow:shot':[{offset:.2,duration:.3,gain:.7},{offset:1,duration:.5,gain:1}]};
const response=()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});
function harness(options={}){
 const calls={fetch:0,decode:0},buffer={duration:2};
 const context={state:'suspended',async decodeAudioData(){calls.decode++;return buffer;},
  createBufferSource(){assert.fail('Loading or selecting effects must not create a source');},
  resume(){assert.fail('Loading effects must not resume the context');},
  suspend(){assert.fail('Loading effects must not suspend the context');}};
 const effects=new RecordedEffects(context,{file:'assets/audio/test.mp3',cues,fetcher:async(url,{signal})=>{
  calls.fetch++;assert(url instanceof URL);assert(url.pathname.endsWith('/assets/audio/test.mp3'));assert(!signal.aborted);return response();
 },...options});
 return{effects,calls,context,buffer};
}

test('concurrent preparation shares one promise and only caches the decoded recording',async()=>{
 const h=harness();assert.equal(h.effects.buffer,null);assert.equal(h.effects.error,null);assert.equal(h.effects.get('crossbow:shot'),null);
 const first=h.effects.prepare();assert.equal(first,h.effects.prepare());assert.equal(first,h.effects.loading);
 assert.equal(await first,h.buffer);assert.equal(h.effects.loading,null);assert.equal(h.effects.error,null);
 assert.equal(await h.effects.prepare(),h.buffer);assert.deepEqual(h.calls,{fetch:1,decode:1});
 assert.deepEqual(h.effects.get('crossbow:shot'),{buffer:h.buffer,offset:.2,duration:.3,gain:.7});
 assert.equal(h.effects.count('crossbow:shot'),2);assert.equal(h.effects.get('crossbow:shot',3).offset,1);
 assert.equal(h.effects.get('crossbow:shot',-1).offset,1);assert.equal(h.context.state,'suspended');
});

test('failed fetch and decode remain idle until an explicit retry',async()=>{
 let attempts=0;const h=harness({fetcher:async()=>{attempts++;if(attempts===1)return{ok:false};return response();}});
 assert.equal(await h.effects.prepare(),null);assert.match(h.effects.error.message,/load failed/);assert.equal(h.effects.loading,null);
 for(let i=0;i<20;i++)assert.equal(h.effects.get('crossbow:shot'),null);
 assert.equal(attempts,1);
 h.context.decodeAudioData=async()=>{throw Error('invalid audio');};
 assert.equal(await h.effects.prepare(),null);assert.match(h.effects.error.message,/invalid audio/);assert.equal(attempts,2);
 h.context.decodeAudioData=async()=>h.buffer;
 assert.equal(await h.effects.prepare(),h.buffer);assert.equal(h.effects.error,null);assert.equal(attempts,3);
});

test('unknown keys and invalid cue ranges never produce playable segments',async()=>{
 const invalid=[{offset:-.1,duration:.5},{offset:1.8,duration:.3},{offset:2,duration:.1},{offset:2,duration:1e-20},
  {offset:0,duration:0},{offset:NaN,duration:.3},{offset:0,duration:Infinity},{offset:0,duration:.3,gain:NaN},
  {offset:0,duration:.3,gain:-1},null];
 const h=harness({cues:{...cues,invalid,exact:[{offset:1.5,duration:.5}]}});await h.effects.prepare();
 for(const key of['missing','toString','__proto__']){assert.equal(h.effects.count(key),0);assert.equal(h.effects.get(key),null);}
 for(let i=0;i<invalid.length;i++)assert.equal(h.effects.get('invalid',i),null);
 assert.equal(h.effects.get('crossbow:shot',Infinity),null);
 assert.deepEqual(h.effects.get('exact'),{buffer:h.buffer,offset:1.5,duration:.5,gain:1});
});

test('timeout aborts the fetch and ignores late decoding without blocking a retry',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 let finish,signal;const h=harness({fetcher:async(_,options)=>{signal=options.signal;return response();}});
 h.context.decodeAudioData=()=>new Promise(resolve=>{finish=resolve;});
 const first=h.effects.prepare();await Promise.resolve();await Promise.resolve();await Promise.resolve();
 assert.equal(typeof finish,'function');t.mock.timers.tick(12000);
 assert.equal(await first,null);assert(signal.aborted);assert.match(h.effects.error.message,/timed out/);assert.equal(h.effects.loading,null);
 h.context.decodeAudioData=async()=>h.buffer;
 assert.equal(await h.effects.prepare(),h.buffer);
 finish({duration:99});await Promise.resolve();await Promise.resolve();
 assert.equal(h.effects.buffer,h.buffer);assert.equal(h.effects.error,null);
});

test('default fetch keeps its global receiver and does not depend on a running context',async t=>{
 const h=harness();t.mock.method(globalThis,'fetch',function(){assert.equal(this,globalThis);return Promise.resolve(response());});
 const effects=new RecordedEffects(h.context,{file:'assets/audio/test.mp3',cues});
 assert.equal(await effects.prepare(),h.buffer);assert.equal(globalThis.fetch.mock.callCount(),1);
 assert.equal(h.context.state,'suspended');
});

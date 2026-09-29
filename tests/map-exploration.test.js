import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createExploration,EXPLORATION_RADIUS} from '../map-exploration.js';

test('fog begins unknown, reveals locally and retains previously explored terrain',()=>{
 for(const half of [82,140]){
  const e=createExploration(half);assert.equal(e.count,0);assert(!e.known(0,0));
  e.reveal(0,0);assert(e.known(0,0));assert(e.known(10,0));assert(!e.known(EXPLORATION_RADIUS+5,0));
  const count=e.count,rev=e.revision;e.reveal(0,0);assert.equal(e.count,count);assert.equal(e.revision,rev);
  e.reveal(60,60);assert(e.known(60,60));assert(e.known(0,0));assert(!e.known(30,30));assert(e.count>count);
  assert.equal(createExploration(half).count,0);
 }
});
test('map edges are bounded and full visibility does not need exploration',()=>{
 for(const half of [82,140]){
  const e=createExploration(half);for(const x of [-half,half])for(const z of [-half,half]){e.reveal(x,z);assert(e.known(x,z));}
  assert(!e.known(half+1,half));assert(!e.known(NaN,0));const count=e.count;e.reveal(NaN,0);e.reveal(Infinity,0);assert.equal(e.count,count);
  const full=createExploration(half,'visible');assert(full.known(half,half));assert(full.known(-half,-half));full.reveal(0,0);assert.equal(full.count,0);
 }
});

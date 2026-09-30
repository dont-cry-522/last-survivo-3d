import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {softenFaceSurface,lingyaHeadY} from '../lingya-face.js';

test('face refinement keeps UV seams closed and normalizes interpolated bone influences',()=>{
 const source=new T.BufferGeometry();source.setAttribute('position',new T.Float32BufferAttribute([0,0,0,1,0,0,0,1,0,1,0,0,1,1,0,0,1,0],3));source.setIndex([0,1,2,3,4,5]);
 source.setAttribute('uv',new T.Float32BufferAttribute([0,0,.5,0,0,.5,.6,0,1,1,0,.6],2));
 source.setAttribute('skinIndex',new T.Uint16BufferAttribute([1,2,0,0,2,1,0,0,2,3,0,0,1,2,0,0,3,1,0,0,3,2,0,0],4));
 source.setAttribute('skinWeight',new T.Float32BufferAttribute([.8,.2,0,0,.5,.5,0,0,.3,.7,0,0,.5,.5,0,0,.4,.6,0,0,.7,.3,0,0],4));
 const before=source.attributes.position.array.slice(),g=softenFaceSurface(source),a=g.attributes;
 assert.deepEqual(source.attributes.position.array,before);assert.equal(g.index.count,24);
 for(const attribute of Object.values(a))assert(Array.from(attribute.array).every(Number.isFinite));
 for(let i=0;i<a.skinWeight.count;i++)assert(Math.abs([0,1,2,3].reduce((s,k)=>s+a.skinWeight.array[i*4+k],0)-1)<1e-6);
 for(const [i,j]of[[1,3],[2,5]]){assert(new T.Vector3().fromBufferAttribute(a.position,i).distanceTo(new T.Vector3().fromBufferAttribute(a.position,j))<1e-7);assert.notDeepEqual(Array.from(a.uv.array.slice(i*2,i*2+2)),Array.from(a.uv.array.slice(j*2,j*2+2)));}
});
test('head lowering keeps the collar anchored and the entire head transform continuous',()=>{
 assert.equal(lingyaHeadY(1.4),1.4);assert(Math.abs(lingyaHeadY(1.7)-1.677)<1e-8);
 let prev=-Infinity;for(let y=1.35;y<1.8;y+=.001){const out=lingyaHeadY(y);assert(out>prev);assert(out<=y);prev=out;}
});

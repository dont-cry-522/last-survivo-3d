import test from 'node:test';
import assert from 'node:assert/strict';
import {COMPANION_SOUNDS,companionSample} from '../companion-audio.js';
test('companion actions have distinct finite samples, quiet boundaries and bounded peaks',()=>{
 for(const rate of[22050,44100,48000]){const signatures=new Set();for(const event of Object.keys(COMPANION_SOUNDS)){
  const s=companionSample(event,rate);let power=0,peak=0;for(const v of s){assert(Number.isFinite(v));power+=v*v;peak=Math.max(peak,Math.abs(v));}
  assert(Math.sqrt(power/s.length)>.003,event+' inaudible');assert(peak<.63);assert(Math.abs(s[0])<.001&&Math.abs(s.at(-1))<.001);assert(s.length<rate);
  signatures.add(Array.from(s.slice(100,140)).map(v=>v.toFixed(5)).join(','));
 }assert.equal(signatures.size,Object.keys(COMPANION_SOUNDS).length);}
});

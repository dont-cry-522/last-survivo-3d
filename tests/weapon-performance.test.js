import test from 'node:test';
import assert from 'node:assert/strict';
import {WEAPONS} from '../rules.js';
import {weaponSample} from '../weapon-audio.js';
import {weaponGesture,shotStarted,WEAPON_RECOVERY} from '../weapon-performance.js';

test('nine weapons have finite bounded distinct shot and impact textures with smooth ends',()=>{
  for(const event of ['shot','impact']){
    const signatures=new Set();
    for(const id of Object.keys(WEAPONS)){
      const s=weaponSample(id,event,22050);let energy=0,peak=0;
      for(const v of s){assert(Number.isFinite(v));energy+=v*v;peak=Math.max(peak,Math.abs(v));}
      assert(Math.sqrt(energy/s.length)>.01,id+' inaudible');assert(peak<.75,id+' clipping');
      assert(Math.abs(s[0])<.0001);assert(Math.abs(s.at(-1))<.001);
      signatures.add(Array.from(s.slice(20,60)).map(n=>n.toFixed(4)).join(','));
    }
    assert.equal(signatures.size,9);
  }
});
test('weapon follow-throughs settle, remain continuous and compress with attack speed',()=>{
  for(const id of Object.keys(WEAPONS))for(const period of [.16,.35,1.3]){
    let previous=weaponGesture(id,0,0,period),peak=0;
    for(let i=1;i<4200;i++){
      const t=i/2000,now=weaponGesture(id,t,Math.min(1,t/period),period);peak=Math.max(peak,now.kick);
      for(const k of ['kick','sweep','draw','gather']){assert(now[k]>=0&&now[k]<=1);assert(Math.abs(now[k]-previous[k])<.08,id+' discontinuity');}previous=now;
    }
    assert(peak>.9);assert.equal(previous.kick,0);assert.equal(previous.draw,0);
    assert(WEAPON_RECOVERY[id]>0);
  }
});
test('explicit shot serial detects another fast shot even while the last pose timer is positive',()=>{
  const d={shotSerial:1};assert(shotStarted(d,.12,.12));assert(!shotStarted(d,.11,.12));
  d.shotSerial++;assert(shotStarted(d,.12,.11));assert(!shotStarted(d,.12,.12));
});

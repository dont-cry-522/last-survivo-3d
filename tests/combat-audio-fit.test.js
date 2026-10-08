import test from 'node:test';
import assert from 'node:assert/strict';
import {GameAudio,contactSpatial} from '../audio.js';

test('contact follows target distance and isometric side without muting visible far hits',()=>{
  const near=contactSpatial(1,0),far=contactSpatial(16,0);
  assert(near.gain>far.gain&&far.gain>.4);
  assert(contactSpatial(4,-4).pan>0&&contactSpatial(-4,4).pan<0);
  assert.equal(contactSpatial(3,3).pan,0);
  assert.equal(contactSpatial().gain,1);
});
test('contact material, hero dodge identity and haste recovery remain separate events',()=>{
  const audio=new GameAudio(),calls=[];audio.allow=()=>true;audio.weapon=(...args)=>calls.push(args);audio.materialEffects={get:()=>({})};
  audio.terrain('wood',4,0);assert.equal(calls.at(-1)[0],'material:wood');assert(calls.at(-1)[3]<.3);
  audio.impact('crossbow',false,0,4,0);assert.equal(calls.at(-1)[0],'crossbow');assert(calls.at(-1)[4]>0);
  audio.dodge('silver');assert.equal(calls.at(-1)[1],'blink');
  audio.dodge('wraith');assert.equal(calls.at(-1)[1],'shadowblink');
  audio.dodge('scout');assert.equal(calls.at(-1)[1],'roll');
  audio.mechanism('crossbow',1,.16);assert.equal(calls.at(-1)[2],1);assert(calls.at(-1)[5]<.16*.32);
});
test('wood and stone retain a cached material fallback before recordings load',()=>{
  const node=()=>({connect(){},disconnect(){}}),ctx={currentTime:1,state:'running',sampleRate:22050,
    createBuffer:(channels,length,rate)=>({duration:length/rate,copyToChannel(){}}),
    createGain:()=>({...node(),gain:{value:0}}),createStereoPanner:()=>({...node(),pan:{value:0}}),
    createBufferSource:()=>({...node(),playbackRate:{value:1},start(){},stop(){this.onended?.();}})};
  const audio=new GameAudio(ctx);audio.ready=true;audio.sfx=node();
  audio.terrain('wood');audio.terrain('stone');assert.equal(audio.weaponSources.size,2);
  assert([...audio.weaponBuffers.keys()].every(key=>key.startsWith('material:')));
  audio.stopWeapons();assert.equal(audio.nodes,0);
});

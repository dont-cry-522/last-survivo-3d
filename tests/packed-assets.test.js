import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {CHARACTER_ASSETS as assets} from '../character-assets.js';
const dir=new URL('../assets/characters/',import.meta.url),read=file=>fs.readFileSync(new URL(file,dir));
test('delivery geometry is byte-for-byte identical to the original models',()=>{
 for(const [name,asset] of Object.entries(assets.models)){
  const original=JSON.parse(read(name+'.gltf')),bin=read(original.buffers[0].uri),glb=gunzipSync(read(asset.file));
  assert.equal(glb.readUInt32LE(0),0x46546c67);assert.equal(glb.readUInt32LE(8),glb.length);
  const length=glb.readUInt32LE(12),json=JSON.parse(glb.subarray(20,20+length));delete original.buffers[0].uri;
  assert.deepEqual(json,original);assert.deepEqual(glb.subarray(28+length,28+length+bin.length),bin);
 }
});
test('compressed and fallback motion carry the same seven valid full-sample clips',()=>{
 const raw=read(assets.motionFallback.file);assert.deepEqual(gunzipSync(read(assets.motion.file)),raw);
 const clips=JSON.parse(raw);assert.equal(clips.length,7);
 for(const clip of clips){assert(clip.duration>0);assert(clip.tracks.length>40);for(const track of clip.tracks){assert(track.values.every(Number.isFinite));assert(track.times.every((t,i)=>!i||t>=track.times[i-1]));}}
});
